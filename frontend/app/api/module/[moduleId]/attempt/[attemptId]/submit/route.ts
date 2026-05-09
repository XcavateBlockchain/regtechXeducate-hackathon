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
  getSubmitAttemptInstructionAsync,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import {
  executeViaSwigDelegate,
  getAdminSigner,
  getPartnerAdminAddress,
  mintCredentialNft,
  sendServerTransaction,
  uuidToBytes,
} from "@/lib/solana/admin";
import { findCredentialPda, findModulePda } from "@/lib/solana/pda";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionIds: z.array(z.string()),
    }),
  ),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ moduleId: string; attemptId: string }> },
) {
  try {
    const { moduleId, attemptId } = await params;
    const body = await req.json();
    const { walletAddress, answers } = bodySchema.parse(body);
    if (!isAddress(walletAddress)) {
      return NextResponse.json(
        {
          error:
            "Invalid walletAddress. Expected a Solana base58 public key (32–44 chars).",
        },
        { status: 400 },
      );
    }

    // ── Load user ────────────────────────────────────────────────────────────
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
    const userId = user.id;

    const employeeId =
      user.role === "EMPLOYEE" ? (user.employment?.id ?? null) : null;
    const isEmployee = employeeId !== null;

    // ── Load attempt (must belong to learner, not yet submitted) ─────────────
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        submittedAt: null,
        OR: isEmployee ? [{ employeeId }, { userId }] : [{ userId }],
      },
      include: {
        batch: {
          include: {
            questions: {
              include: { options: true },
            },
          },
        },
      },
    });
    if (!attempt?.onChainAttemptAddress) {
      return NextResponse.json(
        { error: "Attempt not found or already submitted" },
        { status: 404 },
      );
    }

    // ── Load module + company ────────────────────────────────────────────────
    const module = await prisma.module.findFirst({
      where: { id: moduleId, status: "ACTIVE" },
      include: { company: true },
    });
    if (!module?.moduleIdHash || !module.company.swigAddress) {
      return NextResponse.json(
        { error: "Module not available" },
        { status: 404 },
      );
    }

    const company = module.company;
    const partnerIdBytes = uuidToBytes(company.partnerId);

    // ── Score answers ─────────────────────────────────────────────────────────
    const answerMap = new Map(
      answers.map((a) => [a.questionId, a.selectedOptionIds]),
    );
    let correctPoints = 0;
    let totalPoints = 0;
    const answerRows: {
      attemptId: string;
      questionId: string;
      selectedOptions: string[];
      isCorrect: boolean;
    }[] = [];

    if (!attempt.batch) {
      return NextResponse.json(
        { error: "Attempt is missing batch assignment" },
        { status: 500 },
      );
    }

    for (const question of attempt.batch.questions) {
      totalPoints += question.points;
      const selected = answerMap.get(question.id) ?? [];
      const correctOptionIds = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id);
      const isCorrect =
        correctOptionIds.length === selected.length &&
        correctOptionIds.every((id) => selected.includes(id));
      if (isCorrect) correctPoints += question.points;
      answerRows.push({
        attemptId,
        questionId: question.id,
        selectedOptions: selected,
        isCorrect,
      });
    }

    const scoreBps =
      totalPoints > 0 ? Math.round((correctPoints / totalPoints) * 10000) : 0;
    const passed = scoreBps >= module.passThreshold;
    const score = Math.round(scoreBps / 100);
    const totalCount = attempt.batch.questions.length;
    const correctCount = answerRows.filter((r) => r.isCorrect).length;

    // ── Save answers to DB ────────────────────────────────────────────────────
    await prisma.attemptAnswer.createMany({ data: answerRows });

    // ── Submit attempt on-chain via attestor ──────────────────────────────────
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const [modulePda] = await findModulePda(
      partnerIdBytes,
      module.moduleIdHash,
    );

    const attestorSigner = await getAdminSigner();
    const submitIx = await getSubmitAttemptInstructionAsync({
      attestor: attestorSigner,
      user: walletAddress as Address,
      partner: partnerPda,
      module: modulePda,
      attempt: attempt.onChainAttemptAddress as Address,
      scoreBps,
    });
    try {
      await sendServerTransaction(attestorSigner, [submitIx]);
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
      const alreadyPassed =
        /AlreadyPassed/i.test(msg) ||
        (Array.isArray(logs) && logs.some((l) => /AlreadyPassed/i.test(l)));

      if (alreadyPassed) {
        const now = new Date();

        // If the credential was already minted/recorded, return it (and mark DB complete).
        const existingCredential = await prisma.credential.findFirst({
          where: { recipientId: userId, moduleId },
          select: {
            id: true,
            metadataUri: true,
            credentialAsset: true,
            onChainAddress: true,
            txSignature: true,
            scoreBps: true,
          },
        });

        // Mark this attempt as finished so the UI can stop resuming it.
        await prisma.assessmentAttempt.update({
          where: { id: attemptId },
          data: {
            submittedAt: now,
            passed: true,
            // Score is already committed on-chain from a previous passing attempt.
            // Keep these nullable to avoid inventing a score.
            score: null,
            onChainScoreBps: null,
          },
        });

        if (isEmployee) {
          await prisma.moduleAssignment.update({
            where: { moduleId_employeeId: { moduleId, employeeId } },
            data: {
              status: "COMPLETED",
              completedAt: now,
              ...(existingCredential
                ? { credentialId: existingCredential.id }
                : {}),
            },
          });
        } else {
          await prisma.moduleEnrollment.update({
            where: { moduleId_userId: { moduleId, userId } },
            data: {
              status: "COMPLETED",
              completedAt: now,
              ...(existingCredential
                ? { credentialId: existingCredential.id }
                : {}),
            },
          });
        }

        if (existingCredential) {
          const scoreBps = existingCredential.scoreBps ?? 0;
          const score = Math.round(scoreBps / 100);
          return NextResponse.json({
            passed: true,
            score,
            scoreBps,
            correctCount: 0,
            totalCount: 0,
            startedAt: attempt.startedAt.toISOString(),
            submittedAt: now.toISOString(),
            credential: {
              id: existingCredential.id,
              metadataUri: existingCredential.metadataUri,
              asset: existingCredential.credentialAsset,
              onChainAddress: existingCredential.onChainAddress,
              txSignature: existingCredential.txSignature,
            },
          });
        }

        // No DB credential yet — best effort backfill using the on-chain Attempt state.
        if (company.collectionAddress) {
          const enrollmentAddress = await resolveEnrollmentAddress();
          if (enrollmentAddress) {
            const rpc = createSolanaRpc(appEnv.SOLANA_RPC_URL);
            const attemptAccount = await fetchAttempt(
              rpc,
              attempt.onChainAttemptAddress as Address,
            );
            const scoreBps = attemptAccount.data.lastScoreBps ?? 0;

            const [credentialPda] = await findCredentialPda(
              walletAddress as Address,
              partnerIdBytes,
              module.moduleIdHash,
            );

            const metadataKey = `credentials/${module.moduleIdHash}/${userId}.json`;
            const metadataBody = JSON.stringify({
              name: module.name,
              symbol: CREDENTIAL_NFT_METADATA_SYMBOL,
              description: `Credential for ${module.name}`,
              batchLabel: attempt.batch?.label ?? "—",
              scoreBps,
              issuedAt: now.toISOString(),
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
              attempt: attempt.onChainAttemptAddress as Address,
              credential: credentialPda,
              metadataUri,
            });

            // Claim can be idempotent-ish depending on on-chain state; treat failures as non-fatal.
            let txHash = "";
            try {
              txHash = await executeViaSwigDelegate(
                company.swigAddress as Address,
                claimIx as never,
              );
            } catch {
              // ignore
            }

            const asset = await mintCredentialNft(
              walletAddress as Address,
              module.name,
              metadataUri,
            );

            const credential = await prisma.credential.create({
              data: {
                recipientId: userId,
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
                data: { credentialId: credential.id },
              });
            } else {
              await prisma.moduleEnrollment.update({
                where: { moduleId_userId: { moduleId, userId } },
                data: { credentialId: credential.id },
              });
            }

            return NextResponse.json({
              passed: true,
              score: Math.round(scoreBps / 100),
              scoreBps,
              correctCount: 0,
              totalCount: 0,
              startedAt: attempt.startedAt.toISOString(),
              submittedAt: now.toISOString(),
              credential: {
                id: credential.id,
                metadataUri,
                asset: String(asset),
                onChainAddress: String(credentialPda),
                txSignature: txHash || "UNKNOWN",
              },
            });
          }
        }

        return NextResponse.json(
          { error: "You have already passed this module." },
          { status: 409 },
        );
      }

      throw e;
    }

    // ── Update attempt record ─────────────────────────────────────────────────
    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        passed,
        onChainScoreBps: scoreBps,
        submittedAt: new Date(),
      },
    });

    // ── Issue credential if passed ────────────────────────────────────────────
    let credentialId: string | null = null;
    let credentialResult: null | {
      id: string;
      metadataUri: string;
      asset: string | null;
      onChainAddress: string;
      txSignature: string;
    } = null;

    async function resolveEnrollmentAddress(): Promise<string | null> {
      if (isEmployee) {
        const assignment = await prisma.moduleAssignment.findUnique({
          where: { moduleId_employeeId: { moduleId, employeeId } },
          select: { onChainEnrollmentAddress: true },
        });
        return assignment?.onChainEnrollmentAddress ?? null;
      }
      const enrollment = await prisma.moduleEnrollment.findUnique({
        where: { moduleId_userId: { moduleId, userId } },
        select: { onChainEnrollmentAddress: true },
      });
      return enrollment?.onChainEnrollmentAddress ?? null;
    }

    if (passed) {
      const enrollmentAddress = await resolveEnrollmentAddress();
      if (enrollmentAddress) {
        const [credentialPda] = await findCredentialPda(
          walletAddress as Address,
          partnerIdBytes,
          module.moduleIdHash,
        );

        const metadataKey = `credentials/${module.moduleIdHash}/${userId}.json`;
        const scorePercent = Math.round(scoreBps) / 100;
        const issuedAt = new Date().toISOString();
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
          batchLabel: attempt.batch.label,
          issuedAt,
          attributes: [
            { trait_type: "Recipient", value: user.name },
            { trait_type: "Score (bps)", value: scoreBps },
            { trait_type: "Score (%)", value: scorePercent },
            { trait_type: "Module", value: module.name },
            { trait_type: "Module ID", value: moduleId },
            { trait_type: "Module Hash", value: module.moduleIdHash },
            { trait_type: "Batch", value: attempt.batch.label },
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
          attempt: attempt.onChainAttemptAddress as Address,
          credential: credentialPda,
          metadataUri,
        });
        const txHash = await executeViaSwigDelegate(
          company.swigAddress as Address,
          claimIx as never,
        );

        const asset = await mintCredentialNft(
          walletAddress as Address,
          module.name,
          metadataUri,
        );

        const credential = await prisma.credential.create({
          data: {
            recipientId: userId,
            issuingCompanyId: company.id,
            issuedByUserId: company.ownerId,
            moduleId,
            onChainPartnerId: company.partnerId,
            moduleIdHash: module.moduleIdHash,
            credentialType: module.credentialType,
            metadataUri,
            scoreBps,
            onChainAddress: credentialPda,
            txSignature: txHash,
            credentialAsset: String(asset),
          },
        });
        credentialId = credential.id;
        credentialResult = {
          id: credential.id,
          metadataUri,
          asset: String(asset),
          onChainAddress: String(credentialPda),
          txSignature: txHash,
        };

        if (isEmployee) {
          await prisma.moduleAssignment.update({
            where: { moduleId_employeeId: { moduleId, employeeId } },
            data: {
              status: "COMPLETED",
              finalScoreBps: scoreBps,
              completedAt: new Date(),
              credentialId,
            },
          });
        } else {
          await prisma.moduleEnrollment.update({
            where: { moduleId_userId: { moduleId, userId } },
            data: {
              status: "COMPLETED",
              finalScoreBps: scoreBps,
              completedAt: new Date(),
              credentialId,
            },
          });
        }
      }
    } else if (!passed) {
      if (isEmployee) {
        await prisma.moduleAssignment.update({
          where: { moduleId_employeeId: { moduleId, employeeId } },
          data: { status: "FAILED" },
        });
      } else {
        await prisma.moduleEnrollment.update({
          where: { moduleId_userId: { moduleId, userId } },
          data: { status: "FAILED" },
        });
      }
    }

    return NextResponse.json({
      passed,
      score,
      scoreBps,
      correctCount,
      totalCount,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: new Date().toISOString(),
      credentialId,
      credential: credentialResult,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/module/:moduleId/attempt/:attemptId/submit]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
