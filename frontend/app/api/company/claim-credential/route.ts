import type { Address } from "@solana/kit";
import { createNoopSigner } from "@solana/signers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findPartnerPda,
  getClaimCredentialInstructionAsync,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import {
  executeViaSwigDelegate,
  getPartnerAdminAddress,
  mintCredentialNft,
  uuidToBytes,
} from "@/lib/solana/admin";
import { findCredentialPda, findModulePda } from "@/lib/solana/pda";

const bodySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32), // caller (must be OWNER or ISSUER)
  moduleAssignmentModuleId: z.string().min(1),
  moduleAssignmentEmployeeId: z.string().min(1),
  metadataUri: z.string().url().default(""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyId,
      walletAddress,
      moduleAssignmentModuleId,
      moduleAssignmentEmployeeId,
      metadataUri,
    } = bodySchema.parse(body);

    // ── Load company + verify caller ─────────────────────────────────────────
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { owner: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (
      !company.txConfirmed ||
      !company.swigAddress ||
      !company.collectionAddress
    ) {
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

    // ── Load assignment + attempt ─────────────────────────────────────────────
    const assignment = await prisma.moduleAssignment.findUnique({
      where: {
        moduleId_employeeId: {
          moduleId: moduleAssignmentModuleId,
          employeeId: moduleAssignmentEmployeeId,
        },
      },
      include: {
        module: true,
        employee: { include: { user: true } },
      },
    });
    if (!assignment?.onChainEnrollmentAddress) {
      return NextResponse.json(
        { error: "Enrollment not found or not yet on-chain" },
        { status: 404 },
      );
    }
    if (!assignment.module.moduleIdHash) {
      return NextResponse.json(
        { error: "Module not yet registered on-chain" },
        { status: 400 },
      );
    }

    const attempt = await prisma.assessmentAttempt.findFirst({
      where: {
        assessment: { moduleId: moduleAssignmentModuleId },
        employeeId: moduleAssignmentEmployeeId,
        passed: true,
      },
      orderBy: { submittedAt: "desc" },
    });
    if (!attempt?.onChainAttemptAddress) {
      return NextResponse.json(
        { error: "No passing on-chain attempt found" },
        { status: 400 },
      );
    }

    // ── Derive PDAs ──────────────────────────────────────────────────────────
    const partnerIdBytes = uuidToBytes(company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const [modulePda] = await findModulePda(
      partnerIdBytes,
      assignment.module.moduleIdHash,
    );
    const userWallet = assignment.employee.user.walletAddress as Address;
    const [credentialPda] = await findCredentialPda(
      userWallet,
      partnerIdBytes,
      assignment.module.moduleIdHash,
    );

    // ── Build + send instruction via Swig delegate ───────────────────────────
    const partnerAdminWallet = await getPartnerAdminAddress(
      company.swigAddress as Address,
    );
    const ix = await getClaimCredentialInstructionAsync({
      partnerAdmin: createNoopSigner(partnerAdminWallet),
      partner: partnerPda,
      module: modulePda,
      enrollment: assignment.onChainEnrollmentAddress as Address,
      attempt: attempt.onChainAttemptAddress as Address,
      credential: credentialPda,
      metadataUri,
    });

    const txHash = await executeViaSwigDelegate(
      company.swigAddress as Address,
      ix as never,
    );

    // ── Mint credential NFT to employee's wallet (airdrop) ───────────────────
    const nftAddress = await mintCredentialNft(
      userWallet,
      `${assignment.module.name} Credential`,
      metadataUri,
    );

    // ── Create Credential DB record + mark assignment complete ───────────────
    const [credential] = await prisma.$transaction([
      prisma.credential.create({
        data: {
          recipientId: assignment.employee.user.id,
          issuingCompanyId: companyId,
          issuedByUserId: company.ownerId,
          moduleId: moduleAssignmentModuleId,
          onChainPartnerId: company.partnerId,
          moduleIdHash: assignment.module.moduleIdHash,
          credentialType: assignment.module.credentialType,
          metadataUri,
          scoreBps: attempt.onChainScoreBps,
          onChainAddress: credentialPda,
          txSignature: txHash,
          credentialAsset: nftAddress,
        },
      }),
      prisma.moduleAssignment.update({
        where: {
          moduleId_employeeId: {
            moduleId: moduleAssignmentModuleId,
            employeeId: moduleAssignmentEmployeeId,
          },
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          finalScoreBps: attempt.onChainScoreBps,
        },
      }),
    ]);

    return NextResponse.json(
      { txHash, credentialId: credential.id, nftAddress },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/claim-credential]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
