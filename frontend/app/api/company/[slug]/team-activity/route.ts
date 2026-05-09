import { NextResponse } from "next/server";
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

    const company = await prisma.company.findUnique({
      where: { slug },
      select: { id: true, owner: { select: { walletAddress: true } } },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [activeEmployees, modulesThisWeek, logs] = await Promise.all([
      prisma.employee.count({ where: { companyId: company.id } }),
      prisma.module.count({
        where: { companyId: company.id, createdAt: { gte: since } },
      }),
      prisma.activityLog.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, type: true, metadata: true, createdAt: true },
      }),
    ]);

    return NextResponse.json(
      { activeEmployees, modulesThisWeek, logs },
      { status: 200 },
    );
  } catch (e) {
    console.error("[GET /api/company/[slug]/team-activity]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
