import { NextResponse } from "next/server";
import { z } from "zod";
import { FundingRequestStatus } from "@/generated/prisma/enums";
import { findPartnerPda } from "@/generated/reg_tech";
import { AdminForbiddenError, assertAdminWallet } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { fundAddressFromAdmin, uuidToBytes } from "@/lib/solana/admin";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { walletAddress } = bodySchema.parse(body);

    try {
      assertAdminWallet(walletAddress);
    } catch (e) {
      if (e instanceof AdminForbiddenError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw e;
    }

    const fundingRequest = await prisma.fundingRequest.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!fundingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (fundingRequest.status !== FundingRequestStatus.PENDING) {
      return NextResponse.json(
        { error: "Request is not pending" },
        { status: 409 },
      );
    }

    const lamports = BigInt(fundingRequest.requestedLamports);

    // IMPORTANT: regtech program frequently charges lamports from the Partner PDA,
    // not the Swig system wallet. Fund Partner PDA by default.
    const partnerIdBytes = uuidToBytes(fundingRequest.company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const txHash = await fundAddressFromAdmin(partnerPda, lamports);

    const updated = await prisma.fundingRequest.updateMany({
      where: {
        id,
        status: FundingRequestStatus.PENDING,
      },
      data: {
        status: FundingRequestStatus.APPROVED,
        decidedAt: new Date(),
        decidedByWallet: walletAddress,
        txHash,
      },
    });

    if (updated.count === 0) {
      console.error(
        "[approve funding] DB update failed after successful tx",
        txHash,
        id,
      );
      return NextResponse.json(
        {
          error:
            "Funding transaction succeeded but record update failed — contact support",
          txHash,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ txHash }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/admin/funding-requests/[id]/approve]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
