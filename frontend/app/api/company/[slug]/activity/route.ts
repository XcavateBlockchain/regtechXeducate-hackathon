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
    const limit = Number(searchParams.get("limit") ?? "10");

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

    const logs = await prisma.activityLog.findMany({
      where: { companyId: access.companyId },
      orderBy: { createdAt: "desc" },
      take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 10,
      select: {
        id: true,
        type: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    });

    return NextResponse.json({ logs }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/company/[slug]/activity]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
