import { NextResponse } from "next/server";
import { z } from "zod";
import { FundingRequestStatus } from "@/generated/prisma/enums";
import { AdminForbiddenError, assertAdminWallet } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
  rejectReason: z.string().max(2000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { walletAddress, rejectReason } = bodySchema.parse(body);

    try {
      assertAdminWallet(walletAddress);
    } catch (e) {
      if (e instanceof AdminForbiddenError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw e;
    }

    const updated = await prisma.fundingRequest.updateMany({
      where: {
        id,
        status: FundingRequestStatus.PENDING,
      },
      data: {
        status: FundingRequestStatus.REJECTED,
        decidedAt: new Date(),
        decidedByWallet: walletAddress,
        rejectReason: rejectReason ?? null,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Request not found or not pending" },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/admin/funding-requests/[id]/reject]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
