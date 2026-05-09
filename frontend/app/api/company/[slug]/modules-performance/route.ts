import { NextResponse } from "next/server";
import { getCompanyAccessBySlug } from "@/lib/company-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress || walletAddress.length < 32) {
      return NextResponse.json(
        { error: "walletAddress required" },
        { status: 400 },
      );
    }

    const access = await getCompanyAccessBySlug({ slug, walletAddress });
    if (!access.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const modules = await prisma.module.findMany({
      where: { companyId: access.companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
        assessment: { select: { id: true } },
      },
    });

    const moduleIds = modules.map((m) => m.id);
    const assessmentPairs: Array<{ moduleId: string; assessmentId: string }> =
      modules.flatMap((m) =>
        m.assessment?.id
          ? [{ moduleId: m.id, assessmentId: m.assessment.id }]
          : [],
      );

    const [enrollmentCounts, assignmentCounts] = await Promise.all([
      prisma.moduleEnrollment.groupBy({
        by: ["moduleId", "status"],
        where: { moduleId: { in: moduleIds } },
        _count: { _all: true },
      }),
      prisma.moduleAssignment.groupBy({
        by: ["moduleId", "status"],
        where: { moduleId: { in: moduleIds } },
        _count: { _all: true },
      }),
    ]);

    const counts = new Map<
      string,
      { completed: number; failed: number; testedFallback: number }
    >();

    function bump(
      moduleId: string,
      status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED",
      inc: number,
    ) {
      const current = counts.get(moduleId) ?? {
        completed: 0,
        failed: 0,
        testedFallback: 0,
      };
      if (status === "COMPLETED") current.completed += inc;
      if (status === "FAILED") current.failed += inc;
      if (status === "COMPLETED" || status === "FAILED")
        current.testedFallback += inc;
      counts.set(moduleId, current);
    }

    for (const row of enrollmentCounts)
      bump(row.moduleId, row.status, row._count._all);
    for (const row of assignmentCounts)
      bump(row.moduleId, row.status, row._count._all);

    const testedByModuleId = new Map<string, number>();
    for (const { moduleId, assessmentId } of assessmentPairs) {
      const tested = await prisma.assessmentAttempt.count({
        where: { assessmentId, submittedAt: { not: null } },
      });
      testedByModuleId.set(moduleId, tested);
    }

    const out = modules.map((m) => {
      const c = counts.get(m.id) ?? {
        completed: 0,
        failed: 0,
        testedFallback: 0,
      };
      const denom = c.completed + c.failed;
      const passRate = denom > 0 ? Math.round((c.completed / denom) * 100) : 0;
      const failRate = denom > 0 ? 100 - passRate : 0;
      const tested = testedByModuleId.get(m.id) ?? c.testedFallback;

      return {
        id: m.id,
        name: m.name,
        category: m.category,
        status: m.status,
        tested,
        passRate,
        failRate,
      };
    });

    return NextResponse.json({ modules: out }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/company/[slug]/modules-performance]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
