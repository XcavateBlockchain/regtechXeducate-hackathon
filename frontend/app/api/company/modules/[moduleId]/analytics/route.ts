import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress || walletAddress.length < 32) {
      return NextResponse.json(
        { error: "walletAddress required" },
        { status: 400 },
      );
    }

    const company = await prisma.company.findFirst({
      where: { owner: { walletAddress } },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const module = await prisma.module.findFirst({
      where: { id: moduleId, companyId: company.id },
      select: { id: true },
    });
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const now = Date.now();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30dStart = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const last60dStart = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const [enroll, assign, credentialsIssued] = await Promise.all([
      prisma.moduleEnrollment.findMany({
        where: { moduleId },
        select: {
          status: true,
          joinedAt: true,
          completedAt: true,
          updatedAt: true,
        },
      }),
      prisma.moduleAssignment.findMany({
        where: { moduleId },
        select: {
          status: true,
          assignedAt: true,
          completedAt: true,
          updatedAt: true,
        },
      }),
      prisma.credential.count({ where: { moduleId } }),
    ]);

    const totalEnrolments = enroll.length + assign.length;
    const completedCount =
      enroll.filter((r) => r.status === "COMPLETED").length +
      assign.filter((r) => r.status === "COMPLETED").length;
    const failedCount =
      enroll.filter((r) => r.status === "FAILED").length +
      assign.filter((r) => r.status === "FAILED").length;
    const inProgressCount =
      enroll.filter((r) => r.status === "IN_PROGRESS" || r.status === "PENDING")
        .length +
      assign.filter((r) => r.status === "IN_PROGRESS" || r.status === "PENDING")
        .length;

    const denom = completedCount + failedCount;
    const passRate = denom > 0 ? Math.round((completedCount / denom) * 100) : 0;
    const failRate = denom > 0 ? 100 - passRate : 0;

    const thisWeekNewEnrolments =
      enroll.filter((r) => r.joinedAt >= since7d).length +
      assign.filter((r) => r.assignedAt >= since7d).length;
    const thisWeekNewPasses =
      enroll.filter((r) => r.completedAt && r.completedAt >= since7d).length +
      assign.filter((r) => r.completedAt && r.completedAt >= since7d).length;

    function statusTimeForWindow(row: {
      status: string;
      completedAt: Date | null;
      updatedAt: Date;
    }) {
      // COMPLETED has completedAt; FAILED doesn't, so use updatedAt as best-effort.
      if (row.status === "COMPLETED" && row.completedAt) return row.completedAt;
      return row.updatedAt;
    }

    const lastMonthRows = [
      ...enroll
        .filter((r) => r.status === "COMPLETED" || r.status === "FAILED")
        .map((r) => ({
          status: r.status,
          completedAt: r.completedAt ?? null,
          updatedAt: r.updatedAt,
        })),
      ...assign
        .filter((r) => r.status === "COMPLETED" || r.status === "FAILED")
        .map((r) => ({
          status: r.status,
          completedAt: r.completedAt ?? null,
          updatedAt: r.updatedAt,
        })),
    ].filter((r) => {
      const t = statusTimeForWindow(r);
      return t >= last60dStart && t < last30dStart;
    });

    const lastMonthCompleted = lastMonthRows.filter(
      (r) => r.status === "COMPLETED",
    ).length;
    const lastMonthFailed = lastMonthRows.filter(
      (r) => r.status === "FAILED",
    ).length;
    const lastMonthDenom = lastMonthCompleted + lastMonthFailed;
    const lastMonthPassRate =
      lastMonthDenom > 0
        ? Math.round((lastMonthCompleted / lastMonthDenom) * 100)
        : 0;

    const delta = passRate - lastMonthPassRate;

    return NextResponse.json(
      {
        totalEnrolments,
        completedCount,
        failedCount,
        inProgressCount,
        passRate,
        failRate,
        thisWeek: {
          newEnrolments: thisWeekNewEnrolments,
          newPasses: thisWeekNewPasses,
          since: since7d.toISOString(),
        },
        lastMonth: {
          passRate: lastMonthPassRate,
          delta,
          window: {
            start: last60dStart.toISOString(),
            end: last30dStart.toISOString(),
          },
        },
        credentialsIssued,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[GET /api/company/modules/:moduleId/analytics]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
