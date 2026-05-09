import { NextResponse } from "next/server";
import { z } from "zod";
import { getCompanyAccessBySlug } from "@/lib/company-access";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  walletAddress: z.string().min(32),
  limit: z.preprocess((v) => {
    if (v == null) return undefined;
    if (typeof v === "string" && v.trim() === "") return undefined;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return n;
  }, z.number().int().min(1).max(100).optional()),
});

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const { walletAddress, limit } = querySchema.parse({
      walletAddress: searchParams.get("walletAddress"),
      limit: searchParams.get("limit"),
    });

    const access = await getCompanyAccessBySlug({ slug, walletAddress });
    if (!access.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const credentials = await prisma.credential.findMany({
      where: { issuingCompanyId: access.companyId },
      orderBy: { issuedAt: "desc" },
      take: limit ?? 50,
      select: {
        id: true,
        issuedAt: true,
        metadataUri: true,
        txSignature: true,
        credentialAsset: true,
        onChainAddress: true,
        scoreBps: true,
        module: { select: { id: true, name: true } },
        recipient: {
          select: {
            name: true,
            email: true,
            walletAddress: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ credentials }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[GET /api/company/[slug]/credentials]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
