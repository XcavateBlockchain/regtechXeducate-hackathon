import type { Address } from "@solana/kit";
import { createNoopSigner } from "@solana/signers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findPartnerPda,
  getRevokeEnrollmentInstruction,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import {
  executeViaSwigDelegate,
  getPartnerAdminAddress,
  uuidToBytes,
} from "@/lib/solana/admin";

const bodySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32), // caller (OWNER or ISSUER)
  targetWalletAddress: z.string().min(32),
  reasonCode: z.number().int().min(0).max(255).default(0),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
    const body = await req.json();
    const { companyId, walletAddress, targetWalletAddress, reasonCode } =
      bodySchema.parse(body);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { owner: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (!company.txConfirmed || !company.swigAddress) {
      return NextResponse.json(
        { error: "Company not yet registered on-chain" },
        { status: 400 },
      );
    }

    const isOwner = company.owner.walletAddress === walletAddress;
    if (!isOwner) {
      const emp = await prisma.employee.findFirst({
        where: { companyId, user: { walletAddress }, permission: "ISSUER" },
      });
      if (!emp) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const module = await prisma.module.findFirst({
      where: { id: moduleId, companyId },
      select: { id: true },
    });
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { walletAddress: targetWalletAddress },
      select: {
        id: true,
        employment: { select: { id: true, companyId: true } },
      },
    });
    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 },
      );
    }

    // Resolve enrollment row + on-chain address (employee assignment vs public enrollment).
    let onChainEnrollmentAddress: string | null = null;
    let updateEmployeeId: string | null = null;
    let updateUserId: string | null = null;

    if (
      targetUser.employment?.companyId === companyId &&
      targetUser.employment.id
    ) {
      updateEmployeeId = targetUser.employment.id;
      const assignment = await prisma.moduleAssignment.findUnique({
        where: {
          moduleId_employeeId: { moduleId, employeeId: updateEmployeeId },
        },
        select: { onChainEnrollmentAddress: true },
      });
      onChainEnrollmentAddress = assignment?.onChainEnrollmentAddress ?? null;
    } else {
      updateUserId = targetUser.id;
      const enrollment = await prisma.moduleEnrollment.findUnique({
        where: { moduleId_userId: { moduleId, userId: updateUserId } },
        select: { onChainEnrollmentAddress: true },
      });
      onChainEnrollmentAddress = enrollment?.onChainEnrollmentAddress ?? null;
    }

    if (!onChainEnrollmentAddress) {
      return NextResponse.json(
        { error: "Enrollment not found or not yet on-chain" },
        { status: 404 },
      );
    }

    // Build + send on-chain revoke_enrollment via Swig delegate.
    const partnerIdBytes = uuidToBytes(company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const partnerAdminWallet = await getPartnerAdminAddress(
      company.swigAddress as Address,
    );

    const ix = getRevokeEnrollmentInstruction({
      partnerAdmin: createNoopSigner(partnerAdminWallet),
      partner: partnerPda,
      enrollment: onChainEnrollmentAddress as Address,
      reasonCode,
    });

    const txHash = await executeViaSwigDelegate(
      company.swigAddress as Address,
      ix as never,
    );

    // Update DB as best-effort: mark as FAILED (revoked means no longer active).
    if (updateEmployeeId) {
      await prisma.moduleAssignment.update({
        where: {
          moduleId_employeeId: { moduleId, employeeId: updateEmployeeId },
        },
        data: { status: "FAILED" },
      });
    } else if (updateUserId) {
      await prisma.moduleEnrollment.update({
        where: { moduleId_userId: { moduleId, userId: updateUserId } },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json({ txHash }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/modules/:moduleId/revoke-enrollment]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
