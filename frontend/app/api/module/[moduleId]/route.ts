import { type Address, createSolanaRpc } from "@solana/kit";
import { NextResponse } from "next/server";
import { appEnv } from "@/constants/app-env";
import { fetchMaybeAttempt } from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import { uuidToBytes } from "@/lib/solana/admin";
import { findAttemptPda } from "@/lib/solana/pda";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
    const walletAddress = new URL(req.url).searchParams.get("walletAddress");

    const module = await prisma.module.findFirst({
      where: { id: moduleId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        thumbnailUrl: true,
        completionTime: true,
        language: true,
        passThreshold: true,
        coolDownSeconds: true,
        assessment: {
          select: {
            id: true,
            _count: { select: { batches: true } },
            batches: {
              take: 1,
              orderBy: { sortOrder: "asc" },
              select: {
                label: true,
                questions: { select: { points: true } },
              },
            },
          },
        },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    let enrollment = null;
    let passedSummary: null | {
      scoreBps: number;
      passedAtIso: string | null;
      credential: null | {
        id: string;
        metadataUri: string;
        asset: string | null;
        onChainAddress: string;
        txSignature: string;
      };
    } = null;
    if (walletAddress) {
      const user = await prisma.user.findUnique({
        where: { walletAddress },
        select: {
          id: true,
          role: true,
          employment: { select: { id: true } },
        },
      });
      if (user) {
        // Best-effort: if the on-chain Attempt PDA says "passed", surface it immediately.
        // This prevents users from being asked to "Begin quiz" again after they already passed.
        const moduleChain = await prisma.module.findUnique({
          where: { id: moduleId },
          select: {
            moduleIdHash: true,
            company: { select: { partnerId: true } },
          },
        });
        if (moduleChain?.moduleIdHash && moduleChain.company?.partnerId) {
          const partnerIdBytes = uuidToBytes(moduleChain.company.partnerId);
          const [attemptPda] = await findAttemptPda(
            walletAddress as Address,
            partnerIdBytes,
            moduleChain.moduleIdHash,
          );

          const rpc = createSolanaRpc(appEnv.SOLANA_RPC_URL);
          const attemptAcc = await fetchMaybeAttempt(
            rpc,
            attemptPda as Address,
          );
          if (attemptAcc.exists && attemptAcc.data.passed) {
            const scoreBps = attemptAcc.data.lastScoreBps ?? 0;
            const passedAtIso =
              attemptAcc.data.passedAt.__option === "Some"
                ? new Date(
                    Number(attemptAcc.data.passedAt.value) * 1000,
                  ).toISOString()
                : null;

            const cred = await prisma.credential.findFirst({
              where: { recipientId: user.id, moduleId },
              select: {
                id: true,
                metadataUri: true,
                credentialAsset: true,
                onChainAddress: true,
                txSignature: true,
              },
            });

            passedSummary = {
              scoreBps,
              passedAtIso,
              credential: cred
                ? {
                    id: cred.id,
                    metadataUri: cred.metadataUri,
                    asset: cred.credentialAsset ?? null,
                    onChainAddress: cred.onChainAddress,
                    txSignature: cred.txSignature,
                  }
                : null,
            };
          }
        }

        if (user.role === "EMPLOYEE" && user.employment?.id) {
          const assignment = await prisma.moduleAssignment.findUnique({
            where: {
              moduleId_employeeId: { moduleId, employeeId: user.employment.id },
            },
            select: { status: true },
          });
          if (assignment) {
            const [activeAttempt, lastSubmitted] = await Promise.all([
              prisma.assessmentAttempt.findFirst({
                where: {
                  assessment: { moduleId },
                  employeeId: user.employment.id,
                  submittedAt: null,
                },
                select: { id: true },
                orderBy: { startedAt: "desc" },
              }),
              prisma.assessmentAttempt.findFirst({
                where: {
                  assessment: { moduleId },
                  employeeId: user.employment.id,
                  submittedAt: { not: null },
                },
                select: { passed: true, submittedAt: true },
                orderBy: { submittedAt: "desc" },
              }),
            ]);
            enrollment = {
              status: assignment.status,
              activeAttemptId: activeAttempt?.id ?? null,
              lastSubmittedAtIso:
                lastSubmitted?.submittedAt?.toISOString() ?? null,
              lastPassed: lastSubmitted?.passed ?? null,
              cooldownSeconds: module.coolDownSeconds,
            };
          }
        } else {
          const enroll = await prisma.moduleEnrollment.findUnique({
            where: { moduleId_userId: { moduleId, userId: user.id } },
            select: { status: true },
          });
          if (enroll) {
            const [activeAttempt, lastSubmitted] = await Promise.all([
              prisma.assessmentAttempt.findFirst({
                where: {
                  assessment: { moduleId },
                  userId: user.id,
                  submittedAt: null,
                },
                select: { id: true },
                orderBy: { startedAt: "desc" },
              }),
              prisma.assessmentAttempt.findFirst({
                where: {
                  assessment: { moduleId },
                  userId: user.id,
                  submittedAt: { not: null },
                },
                select: { passed: true, submittedAt: true },
                orderBy: { submittedAt: "desc" },
              }),
            ]);
            enrollment = {
              status: enroll.status,
              activeAttemptId: activeAttempt?.id ?? null,
              lastSubmittedAtIso:
                lastSubmitted?.submittedAt?.toISOString() ?? null,
              lastPassed: lastSubmitted?.passed ?? null,
              cooldownSeconds: module.coolDownSeconds,
            };
          }
        }

        if (passedSummary && enrollment) {
          enrollment = {
            ...enrollment,
            lastPassed: true,
            lastSubmittedAtIso:
              enrollment.lastSubmittedAtIso ?? passedSummary.passedAtIso,
          };
        }
      }
    }

    return NextResponse.json({
      module: {
        id: module.id,
        name: module.name,
        description: module.description,
        category: module.category,
        thumbnailUrl: module.thumbnailUrl,
        completionTime: module.completionTime,
        language: module.language,
        passThreshold: module.passThreshold,
        cooldownSeconds: module.coolDownSeconds,
        quiz: {
          batchCount: module.assessment?._count.batches ?? 0,
          pointsPerBatch:
            module.assessment?.batches[0]?.questions.reduce(
              (sum, q) => sum + q.points,
              0,
            ) ?? 0,
          sampleBatchLabel: module.assessment?.batches[0]?.label ?? null,
        },
      },
      enrollment,
      passedSummary,
    });
  } catch (e) {
    console.error("[GET /api/module/:moduleId]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
