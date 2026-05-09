import { createSolanaRpc } from "@solana/kit";
import { NextResponse } from "next/server";
import { appEnv } from "@/constants/app-env";
import { findPartnerPda } from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import { getPartnerAdminAddress, uuidToBytes } from "@/lib/solana/admin";

const { SOLANA_RPC_URL: RPC_URL } = appEnv;

const LAMPORTS_PER_SOL = 1_000_000_000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("walletAddress");

  if (!walletAddress || walletAddress.length < 32) {
    return NextResponse.json(
      { error: "walletAddress required" },
      { status: 400 },
    );
  }

  const company = await prisma.company.findFirst({
    where: { owner: { walletAddress } },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      website: true,
      owner: { select: { email: true, name: true, role: true } },
      swigAddress: true,
      txConfirmed: true,
      collectionAddress: true,
      partnerId: true,
      attestor: true,
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  let swigSolBalance = 0;
  let swigWalletAddress: string | null = null;
  let partnerVaultAddress: string | null = null;
  let partnerVaultSolBalance = 0;
  if (company.swigAddress) {
    try {
      const rpc = createSolanaRpc(RPC_URL);
      swigWalletAddress = String(
        await getPartnerAdminAddress(
          company.swigAddress as Parameters<typeof getPartnerAdminAddress>[0],
        ),
      );
      const { value: lamports } = await rpc
        .getBalance(swigWalletAddress as Parameters<typeof rpc.getBalance>[0])
        .send();
      swigSolBalance = Number(lamports) / LAMPORTS_PER_SOL;

      // Many regtech instructions pay rent from the Partner PDA itself (program-signed),
      // so we expose its balance as the "partner vault".
      const partnerIdBytes = uuidToBytes(company.partnerId);
      const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
      partnerVaultAddress = String(partnerPda);
      const { value: partnerLamports } = await rpc
        .getBalance(partnerPda as Parameters<typeof rpc.getBalance>[0])
        .send();
      partnerVaultSolBalance = Number(partnerLamports) / LAMPORTS_PER_SOL;
    } catch {
      // non-fatal — return 0 if RPC fails
    }
  }

  return NextResponse.json({
    company,
    swigSolBalance,
    swigWalletAddress,
    partnerVaultAddress,
    partnerVaultSolBalance,
  });
}
