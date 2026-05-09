import type { Address } from "@solana/kit";
import { none } from "@solana/options";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findPartnerPda,
  getRegisterPartnerInstructionAsync,
} from "@/generated/reg_tech";
import { getCompanyAccessBySlug } from "@/lib/company-access";
import { prisma } from "@/lib/prisma";
import {
  createCredentialCollection,
  getAdminSigner,
  getPartnerAdminAddress,
  sendServerTransaction,
  uuidToBytes,
} from "@/lib/solana/admin";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const body = await req.json();
    const { walletAddress } = bodySchema.parse(body);

    const access = await getCompanyAccessBySlug({ slug, walletAddress });
    if (!access.ok || access.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { slug },
      include: { owner: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company.txConfirmed) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!company.swigAddress) {
      return NextResponse.json(
        { error: "Company is missing swigAddress" },
        { status: 400 },
      );
    }

    const adminSigner = await getAdminSigner();
    const partnerIdBytes = uuidToBytes(company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });

    const collectionAddress = company.collectionAddress
      ? (company.collectionAddress as Address)
      : await createCredentialCollection(company.name, partnerPda);

    const partnerAdminWallet = await getPartnerAdminAddress(
      company.swigAddress as Address,
    );

    const registerIx = await getRegisterPartnerInstructionAsync({
      admin: adminSigner,
      partner: partnerPda,
      collection: collectionAddress,
      partnerAdmin: partnerAdminWallet,
      attestor: adminSigner.address as Address,
      partnerId: partnerIdBytes,
      name: company.name,
      passThresholdBpsOverride: none(),
      cooldownSecondsOverride: none(),
    });

    const txHash = await sendServerTransaction(adminSigner, [registerIx]);

    await prisma.company.update({
      where: { id: company.id },
      data: {
        collectionAddress: String(collectionAddress),
        txHash,
        txConfirmed: true,
      },
    });

    return NextResponse.json({ ok: true, txHash }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/[slug]/confirm-onchain]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
