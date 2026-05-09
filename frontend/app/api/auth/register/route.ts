import type { Address } from "@solana/kit";
import { none } from "@solana/options";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appEnv } from "@/constants/app-env";
import {
  findPartnerPda,
  getRegisterPartnerInstructionAsync,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import {
  createCredentialCollection,
  createSwigForCompany,
  getAdminSigner,
  getPartnerAdminAddress,
  sendServerTransaction,
  uuidToBytes,
} from "@/lib/solana/admin";
import { isReservedSlug } from "@/lib/validations/reserved-slugs";

const registerSchema = z.object({
  walletAddress: z.string().min(32),
  name: z.string().min(1),
  email: z.email(),
  companyName: z.string().min(1).max(120),
  companySlug: z.string().min(2).max(64),
  industry: z.string().min(1),
  description: z.string().max(2000).optional(),
});

function parseInitialFundLamports(): bigint {
  const raw = appEnv.INITIAL_SWIG_FUND_LAMPORTS;
  if (!raw) return 0n;

  // Accept common .env formats like "200_000_000" and whitespace.
  const normalized = raw.trim().replace(/_/g, "");
  if (normalized === "") return 0n;
  if (!/^\d+$/.test(normalized)) {
    throw new Error(
      "INITIAL_SWIG_FUND_LAMPORTS must be an integer lamports string (e.g. 200000000 or 200_000_000)",
    );
  }
  return BigInt(normalized);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    if (isReservedSlug(data.companySlug)) {
      return NextResponse.json(
        { error: "Company URL is reserved" },
        { status: 400 },
      );
    }

    // Check for duplicates
    const [existingWallet, existingEmail, existingSlug] = await Promise.all([
      prisma.user.findUnique({ where: { walletAddress: data.walletAddress } }),
      prisma.user.findUnique({ where: { email: data.email } }),
      prisma.company.findUnique({ where: { slug: data.companySlug } }),
    ]);

    if (existingWallet) {
      return NextResponse.json(
        { error: "Wallet already registered" },
        { status: 409 },
      );
    }
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }
    if (existingSlug) {
      return NextResponse.json(
        { error: "Company URL already taken" },
        { status: 409 },
      );
    }

    const adminSigner = await getAdminSigner();
    const initialFundLamports = parseInitialFundLamports();

    // Server creates + configures a Swig wallet (admin pays).
    const { swigAddress, swigId } = await createSwigForCompany(
      data.walletAddress as Address,
      initialFundLamports,
    );

    // Create User + Company first (we need company.partnerId for the on-chain PDAs).
    const { userId, companyId, companyPartnerId, companyName, companySwig } =
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            userId: `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
            walletAddress: data.walletAddress,
            name: data.name,
            email: data.email,
            role: "OWNER",
          },
        });

        const company = await tx.company.create({
          data: {
            name: data.companyName,
            slug: data.companySlug,
            description: data.description ?? null,
            swigAddress: String(swigAddress),
            swigId,
            // Single-key model: admin is the attestor for all partners.
            attestor: String(adminSigner.address),
            txConfirmed: false,
            ownerId: user.id,
          },
          select: { id: true, partnerId: true, name: true, swigAddress: true },
        });

        return {
          userId: user.id,
          companyId: company.id,
          companyPartnerId: company.partnerId,
          companyName: company.name,
          companySwig: company.swigAddress,
        };
      });

    // Register partner on-chain (admin signs + pays)
    const partnerIdBytes = uuidToBytes(companyPartnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });

    const collectionAddress = await createCredentialCollection(
      companyName,
      partnerPda,
    );

    const partnerAdminWallet = await getPartnerAdminAddress(
      companySwig as Address,
    );
    const registerIx = await getRegisterPartnerInstructionAsync({
      admin: adminSigner,
      partner: partnerPda,
      collection: collectionAddress,
      partnerAdmin: partnerAdminWallet,
      attestor: adminSigner.address as Address,
      partnerId: partnerIdBytes,
      name: companyName,
      passThresholdBpsOverride: none(),
      cooldownSecondsOverride: none(),
    });

    const txHash = await sendServerTransaction(adminSigner, [registerIx]);

    await prisma.company.update({
      where: { id: companyId },
      data: {
        collectionAddress: String(collectionAddress),
        txHash,
        txConfirmed: true,
      },
    });

    return NextResponse.json({ userId, companyId }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/auth/register]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
