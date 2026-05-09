import { createSolanaRpc } from "@solana/kit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appEnv } from "@/constants/app-env";
import { fetchPartner, findPartnerPda } from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import { uuidToBytes } from "@/lib/solana/admin";

const { SOLANA_RPC_URL: RPC_URL } = appEnv;

const querySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = querySchema.parse({
      companyId: searchParams.get("companyId"),
      walletAddress: searchParams.get("walletAddress"),
    });

    const company = await prisma.company.findUnique({
      where: { id: query.companyId },
      include: { owner: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.owner.walletAddress !== query.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rpc = createSolanaRpc(RPC_URL);
    const partnerIdBytes = uuidToBytes(company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const partner = await fetchPartner(rpc, partnerPda);

    const purchased = Number(partner.data.quizzesPurchased);
    const consumed = Number(partner.data.quizzesConsumed);
    const refunded = Number(partner.data.quizzesRefunded);
    const remaining = Math.max(0, purchased - consumed - refunded);

    return NextResponse.json(
      { purchased, consumed, refunded, remaining },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[GET /api/company/quiz-balance]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
