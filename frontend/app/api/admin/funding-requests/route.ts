import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminForbiddenError, assertAdminWallet } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  walletAddress: z.string().min(32),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.parse({
      walletAddress: searchParams.get("walletAddress"),
      status: searchParams.get("status") ?? undefined,
    });

    try {
      assertAdminWallet(parsed.walletAddress);
    } catch (e) {
      if (e instanceof AdminForbiddenError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw e;
    }

    const requests = await prisma.fundingRequest.findMany({
      where: parsed.status ? { status: parsed.status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            swigAddress: true,
          },
        },
      },
    });

    return NextResponse.json({ requests }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[GET /api/admin/funding-requests]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
