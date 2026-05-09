import { PutObjectCommand } from "@aws-sdk/client-s3";
import { type Address, createSolanaRpc, isAddress } from "@solana/kit";
import { createNoopSigner } from "@solana/signers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appEnv, CREDENTIAL_NFT_METADATA_SYMBOL } from "@/constants/app-env";
import {
  fetchAttempt,
  findPartnerPda,
  getClaimCredentialInstructionAsync,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import {
  executeViaSwigDelegate,
  getPartnerAdminAddress,
  mintCredentialNft,
  uuidToBytes,
} from "@/lib/solana/admin";
import {
  findAttemptPda,
  findCredentialPda,
  findModulePda,
} from "@/lib/solana/pda";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
    const json = await req.json();
    const { walletAddress } = bodySchema.parse(json);
    if (!isAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid walletAddress" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        id: true,
        name: true,
        role: true,
        employment: { select: { id: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const module = await prisma.module.findFirst({
      where: { id: moduleId, status: "ACTIVE" },
      include: { company: true },
    });
    if (!module?.moduleIdHash || !module.company?.swigAddress) {
      return NextResponse.json(
        { error: "Module not available" },
        { status: 404 },
      );
    }
    const company = module.company;

    const employeeId =
      user.role === "EMPLOYEE" ? (user.employment?.id ?? null) : null;
    const isEmployee = employeeId !== null;

    // Resolve enrollment PDA address from DB (must be enrolled on-chain).
    const enrollmentAddress = isEmployee
      ? ((
          await prisma.moduleAssignment.findUnique({
            where: { moduleId_employeeId: { moduleId, employeeId } },
            select: { onChainEnrollmentAddress: true },
          })
        )?.onChainEnrollmentAddress ?? null)
      : ((
          await prisma.moduleEnrollment.findUnique({
            where: { moduleId_userId: { moduleId, userId: user.id } },
            select: { onChainEnrollmentAddress: true },
          })
        )?.onChainEnrollmentAddress ?? null);

    if (!enrollmentAddress || enrollmentAddress.length < 32) {
      return NextResponse.json(
        { error: "Enrollment missing on-chain. Start the module first." },
        { status: 409 },
      );
    }

    const partnerIdBytes = uuidToBytes(company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const [modulePda] = await findModulePda(
      partnerIdBytes,
      module.moduleIdHash,
    );

    const [attemptPda] = await findAttemptPda(
      walletAddress as Address,
      partnerIdBytes,
      module.moduleIdHash,
    );

    const rpc = createSolanaRpc(appEnv.SOLANA_RPC_URL);
    const attemptAcc = await fetchAttempt(rpc, attemptPda as Address);
    if (!attemptAcc.data.passed) {
      return NextResponse.json(
        { error: "You must pass the quiz before claiming a credential." },
        { status: 409 },
      );
    }

    const scoreBps = attemptAcc.data.lastScoreBps ?? 0;
    const [credentialPda] = await findCredentialPda(
      walletAddress as Address,
      partnerIdBytes,
      module.moduleIdHash,
    );

    // If we already have the credential recorded, return it.
    const existing = await prisma.credential.findUnique({
      where: { onChainAddress: String(credentialPda) },
      select: {
        id: true,
        metadataUri: true,
        credentialAsset: true,
        onChainAddress: true,
        txSignature: true,
      },
    });
    if (existing) {
      return NextResponse.json(
        {
          credential: {
            id: existing.id,
            metadataUri: existing.metadataUri,
            asset: existing.credentialAsset ?? null,
            onChainAddress: existing.onChainAddress,
            txSignature: existing.txSignature,
          },
          scoreBps,
        },
        { status: 200 },
      );
    }

    const now = new Date();
    const metadataKey = `credentials/${module.moduleIdHash}/${user.id}.json`;
    const scorePercent = Math.round(scoreBps) / 100;
    const issuedAt = now.toISOString();
    const metadataBody = JSON.stringify({
      name: module.name,
      symbol: `${CREDENTIAL_NFT_METADATA_SYMBOL.toLocaleUpperCase()}-${module.company.name.toUpperCase()}`,
      description: `Credential for ${module.name}`,
      image: module.thumbnailUrl,
      recipientName: user.name,
      scoreBps,
      scorePercent,
      moduleId,
      moduleIdHash: module.moduleIdHash,
      issuedAt,
      attributes: [
        { trait_type: "Recipient", value: user.name },
        { trait_type: "Score (bps)", value: scoreBps },
        { trait_type: "Score (%)", value: scorePercent },
        { trait_type: "Module", value: module.name },
        { trait_type: "Module ID", value: moduleId },
        { trait_type: "Module Hash", value: module.moduleIdHash },
        { trait_type: "Issued At", value: issuedAt },
      ],
    });
    await s3.send(
      new PutObjectCommand({
        Bucket: appEnv.AWS_S3_BUCKET_NAME,
        Key: metadataKey,
        Body: metadataBody,
        ContentType: "application/json",
      }),
    );
    const metadataUri = `https://${appEnv.AWS_S3_BUCKET_NAME}.s3.${appEnv.XCAV_AWS_REGION}.amazonaws.com/${metadataKey}`;

    const partnerAdminWallet = await getPartnerAdminAddress(
      company.swigAddress as Address,
    );
    const claimIx = await getClaimCredentialInstructionAsync({
      partnerAdmin: createNoopSigner(partnerAdminWallet),
      partner: partnerPda,
      module: modulePda,
      enrollment: enrollmentAddress as Address,
      attempt: attemptPda as Address,
      credential: credentialPda,
      metadataUri,
    });

    let txHash = "";
    try {
      txHash = await executeViaSwigDelegate(
        company.swigAddress as Address,
        claimIx as never,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const logs =
        typeof e === "object" &&
        e !== null &&
        "context" in e &&
        typeof (e as { context?: unknown }).context === "object" &&
        (e as { context?: unknown }).context !== null &&
        "logs" in (e as { context: Record<string, unknown> }).context
          ? (((e as { context: { logs?: unknown } }).context.logs ?? null) as
              | null
              | string[])
          : null;
      const alreadyInitialized =
        /AlreadyInitialized/i.test(msg) ||
        (Array.isArray(logs) &&
          logs.some((l) => /AlreadyInitialized/i.test(l)));

      if (!alreadyInitialized) throw e;
      // On-chain credential PDA already exists. Continue to mint + record off-chain.
      txHash = "ALREADY_CLAIMED";
    }

    const asset = await mintCredentialNft(
      walletAddress as Address,
      module.name,
      metadataUri,
    );

    const created = await prisma.credential.create({
      data: {
        recipientId: user.id,
        issuingCompanyId: company.id,
        issuedByUserId: company.ownerId,
        moduleId,
        onChainPartnerId: company.partnerId,
        moduleIdHash: module.moduleIdHash,
        credentialType: module.credentialType,
        metadataUri,
        scoreBps,
        onChainAddress: credentialPda,
        txSignature: txHash || "UNKNOWN",
        credentialAsset: String(asset),
      },
    });

    if (isEmployee) {
      await prisma.moduleAssignment.update({
        where: { moduleId_employeeId: { moduleId, employeeId } },
        data: {
          status: "COMPLETED",
          completedAt: now,
          finalScoreBps: scoreBps,
          credentialId: created.id,
        },
      });
    } else {
      await prisma.moduleEnrollment.update({
        where: { moduleId_userId: { moduleId, userId: user.id } },
        data: {
          status: "COMPLETED",
          completedAt: now,
          finalScoreBps: scoreBps,
          credentialId: created.id,
        },
      });
    }

    return NextResponse.json(
      {
        credential: {
          id: created.id,
          metadataUri,
          asset: String(asset),
          onChainAddress: String(credentialPda),
          txSignature: txHash,
        },
        scoreBps,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/module/:moduleId/claim-credential]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
