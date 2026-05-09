import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enrollEmployeeUserOnChain } from "@/lib/server/enroll";

const bodySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32),
  employeeUserIds: z.array(z.string().min(1)).min(1),
});

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string; moduleId: string }> },
) {
  try {
    const { slug, moduleId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId") ?? "";
    const walletAddress = searchParams.get("walletAddress") ?? "";

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId required" },
        { status: 400 },
      );
    }
    if (!walletAddress || walletAddress.length < 32) {
      return NextResponse.json(
        { error: "walletAddress required" },
        { status: 400 },
      );
    }

    const company = await prisma.company.findUnique({
      where: { slug },
      select: { id: true, owner: { select: { walletAddress: true } } },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.id !== companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 400 });
    }
    if (company.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const assignments = await prisma.moduleAssignment.findMany({
      where: { moduleId, module: { companyId } },
      orderBy: { assignedAt: "desc" },
      select: {
        employeeId: true,
        status: true,
        onChainEnrollmentAddress: true,
        assignedAt: true,
        employee: {
          select: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json({ assignments }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/company/[slug]/modules/:moduleId/assignments]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string; moduleId: string }> },
) {
  try {
    const { slug, moduleId } = await ctx.params;
    const json = await req.json();
    const { companyId, walletAddress, employeeUserIds } =
      bodySchema.parse(json);

    const company = await prisma.company.findUnique({
      where: { slug },
      include: { owner: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.id !== companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 400 });
    }
    if (company.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const module = await prisma.module.findFirst({
      where: { id: moduleId, companyId },
      select: { id: true },
    });
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const actor = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true },
    });
    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    const employees = await prisma.employee.findMany({
      where: { companyId, userId: { in: employeeUserIds } },
      select: { id: true, userId: true },
    });
    const employeeByUserId = new Map(employees.map((e) => [e.userId, e.id]));

    const results: Array<{
      employeeUserId: string;
      ok: boolean;
      txHash?: string;
      enrollmentAddress?: string;
      error?: string;
    }> = [];

    for (const employeeUserId of employeeUserIds) {
      const employeeId = employeeByUserId.get(employeeUserId);
      if (!employeeId) {
        results.push({
          employeeUserId,
          ok: false,
          error: "Employee not found in company",
        });
        continue;
      }

      await prisma.moduleAssignment.upsert({
        where: { moduleId_employeeId: { moduleId, employeeId } },
        update: {
          assignedByUserId: actor.id,
          status: "PENDING",
        },
        create: {
          moduleId,
          employeeId,
          assignedByUserId: actor.id,
          status: "PENDING",
          reasonCode: 0,
        },
      });

      try {
        const { txHash, enrollmentAddress } = await enrollEmployeeUserOnChain({
          companyId,
          walletAddress,
          employeeUserId,
          moduleId,
          reasonCode: 0,
        });

        await prisma.moduleAssignment.update({
          where: { moduleId_employeeId: { moduleId, employeeId } },
          data: {
            onChainEnrollmentAddress: enrollmentAddress,
            status: "IN_PROGRESS",
          },
        });

        results.push({
          employeeUserId,
          ok: true,
          txHash,
          enrollmentAddress,
        });
      } catch (e) {
        results.push({
          employeeUserId,
          ok: false,
          error: e instanceof Error ? e.message : "Enrollment failed",
        });
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error(
      "[POST /api/company/[slug]/modules/:moduleId/assignments]",
      e,
    );
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
