import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  walletAddress: z.string().min(32),
});

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const { walletAddress } = querySchema.parse({
      walletAddress: searchParams.get("walletAddress") ?? "",
    });

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

    const employees = await prisma.employee.findMany({
      where: { companyId: company.id },
      orderBy: { joinedAt: "desc" },
      select: {
        id: true,
        permission: true,
        department: true,
        jobTitle: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    return NextResponse.json({ employees }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[GET /api/company/[slug]/employees]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
