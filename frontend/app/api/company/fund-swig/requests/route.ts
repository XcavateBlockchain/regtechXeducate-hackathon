import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { companyId, walletAddress } = querySchema.parse({
      companyId: searchParams.get("companyId"),
      walletAddress: searchParams.get("walletAddress"),
    });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { owner: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const requests = await prisma.fundingRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ requests }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[GET /api/company/fund-swig/requests]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
