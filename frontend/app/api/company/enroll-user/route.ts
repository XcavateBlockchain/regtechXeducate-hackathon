import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enrollEmployeeUserOnChain } from "@/lib/server/enroll";

const bodySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32), // caller (must be OWNER or ISSUER)
  employeeUserId: z.string().min(1), // User.id of the employee to enroll
  moduleId: z.string().min(1),
  reasonCode: z.number().int().min(0).max(255).default(0),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId, walletAddress, employeeUserId, moduleId, reasonCode } =
      bodySchema.parse(body);

    const { txHash, enrollmentAddress } = await enrollEmployeeUserOnChain({
      companyId,
      walletAddress,
      employeeUserId,
      moduleId,
      reasonCode,
    });

    // ── Update DB ────────────────────────────────────────────────────────────
    const employee = await prisma.employee.findFirst({
      where: { userId: employeeUserId, companyId },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 },
      );
    }

    const actor = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true },
    });
    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    await prisma.moduleAssignment.upsert({
      where: { moduleId_employeeId: { moduleId, employeeId: employee.id } },
      update: {
        onChainEnrollmentAddress: enrollmentAddress,
        status: "IN_PROGRESS",
      },
      create: {
        moduleId,
        employeeId: employee.id,
        assignedByUserId: actor.id,
        status: "IN_PROGRESS",
        reasonCode,
        onChainEnrollmentAddress: enrollmentAddress,
      },
    });

    return NextResponse.json({ txHash, enrollmentAddress }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/enroll-user]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
