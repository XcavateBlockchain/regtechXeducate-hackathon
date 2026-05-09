import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { Address } from "@solana/kit";
import { createSolanaRpc } from "@solana/kit";
import { createNoopSigner } from "@solana/signers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appEnv } from "@/constants/app-env";
import {
  findPartnerPda,
  getRegisterModuleInstructionAsync,
} from "@/generated/reg_tech";
import { REGTECH_ERROR__VAULT_INSUFFICIENT } from "@/generated/reg_tech/errors/regtech";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import {
  executeViaSwigDelegate,
  getPartnerAdminAddress,
  uuidToBytes,
} from "@/lib/solana/admin";
import { findModulePda } from "@/lib/solana/pda";

const bodySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string; moduleId: string }> },
) {
  let partnerAdminWalletForDebug: Address | null = null;
  let partnerIdForDebug: string | null = null;
  try {
    const { slug, moduleId } = await ctx.params;
    const body = await req.json();
    const { companyId, walletAddress } = bodySchema.parse(body);

    const company = await prisma.company.findUnique({
      where: { slug },
      include: { owner: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.id !== companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 400 });
    }
    if (!company.txConfirmed || !company.swigAddress) {
      return NextResponse.json(
        { error: "Company not yet registered on-chain" },
        { status: 400 },
      );
    }
    partnerIdForDebug = company.partnerId;
    if (company.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const module = await prisma.module.findFirst({
      where: { id: moduleId, companyId, status: "DRAFT" },
    });
    if (!module?.moduleIdHash || !module.moduleCode) {
      return NextResponse.json(
        { error: "Module not found or not ready to publish" },
        { status: 404 },
      );
    }

    const actor = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true },
    });

    const metadata = {
      name: module.name,
      description: module.description,
      category: module.category,
      language: module.language,
      completionTime: module.completionTime,
      thumbnailUrl: module.thumbnailUrl,
      credentialType: module.credentialType,
      moduleCode: module.moduleCode,
    };

    const metadataKey = `modules/${module.moduleIdHash}/metadata.json`;
    await s3.send(
      new PutObjectCommand({
        Bucket: appEnv.AWS_S3_BUCKET_NAME,
        Key: metadataKey,
        Body: JSON.stringify(metadata),
        ContentType: "application/json",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    const metadataUri = `https://${appEnv.AWS_S3_BUCKET_NAME}.s3.${appEnv.XCAV_AWS_REGION}.amazonaws.com/${metadataKey}`;

    const partnerIdBytes = uuidToBytes(company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const [modulePda] = await findModulePda(
      partnerIdBytes,
      module.moduleIdHash,
    );

    const partnerAdminWallet = await getPartnerAdminAddress(
      company.swigAddress as Address,
    );
    partnerAdminWalletForDebug = partnerAdminWallet;
    const ix = await getRegisterModuleInstructionAsync({
      partnerAdmin: createNoopSigner(partnerAdminWallet),
      partner: partnerPda,
      module: modulePda,
      moduleIdHash: new Uint8Array(Buffer.from(module.moduleIdHash, "hex")),
      moduleCode: module.moduleCode,
      metadataUri,
      passThresholdBpsOverride: module.passThreshold,
      cooldownSecondsOverride: BigInt(module.coolDownSeconds),
      expiresInSeconds: module.expiresInSeconds
        ? BigInt(module.expiresInSeconds)
        : null,
    });

    const txHash = await executeViaSwigDelegate(
      company.swigAddress as Address,
      ix as never,
    );

    await prisma.module.update({
      where: { id: moduleId },
      data: {
        metadataUri,
        txConfirmed: true,
        txHash,
        status: "ACTIVE",
      },
    });

    if (actor) {
      await prisma.activityLog.create({
        data: {
          companyId,
          actorId: actor.id,
          type: "MODULE_PUBLISHED",
          metadata: {
            moduleId,
            moduleName: module.name,
            txHash,
          },
        },
      });
    }

    return NextResponse.json({ txHash, moduleId }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }

    const anyErr = e as {
      context?: { code?: number };
      cause?: { context?: { code?: number } };
    } | null;
    const code = anyErr?.context?.code ?? anyErr?.cause?.context?.code;
    if (code === REGTECH_ERROR__VAULT_INSUFFICIENT || code === 6020) {
      const swigWalletAddress = partnerAdminWalletForDebug
        ? String(partnerAdminWalletForDebug)
        : null;
      let swigWalletSolBalance: number | null = null;
      let partnerPdaAddress: string | null = null;
      let partnerPdaSolBalance: number | null = null;
      const rpcUrl = appEnv.SOLANA_RPC_URL;
      try {
        if (partnerAdminWalletForDebug) {
          const rpc = createSolanaRpc(rpcUrl);
          const { value: lamports } = await rpc
            .getBalance(
              partnerAdminWalletForDebug as Parameters<
                typeof rpc.getBalance
              >[0],
            )
            .send();
          swigWalletSolBalance = Number(lamports) / 1_000_000_000;
        }
        if (partnerIdForDebug) {
          const partnerIdBytes = uuidToBytes(partnerIdForDebug);
          const [partnerPda] = await findPartnerPda({
            partnerId: partnerIdBytes,
          });
          partnerPdaAddress = String(partnerPda);
          const rpc = createSolanaRpc(rpcUrl);
          const { value: partnerLamports } = await rpc
            .getBalance(partnerPda as Parameters<typeof rpc.getBalance>[0])
            .send();
          partnerPdaSolBalance = Number(partnerLamports) / 1_000_000_000;
        }
      } catch {
        // ignore
      }

      return NextResponse.json(
        {
          error:
            "Company vault has insufficient SOL. Fund the Swig wallet/vault address and retry.",
          code,
          rpcUrl,
          swigWalletAddress,
          swigWalletSolBalance,
          partnerPdaAddress,
          partnerPdaSolBalance,
        },
        { status: 402 },
      );
    }

    console.error("[POST /api/company/[slug]/modules/:moduleId/publish]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
