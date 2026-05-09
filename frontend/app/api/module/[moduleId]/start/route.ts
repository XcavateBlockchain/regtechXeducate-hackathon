import { type Address, createSolanaRpc, isAddress } from "@solana/kit";
import { createNoopSigner } from "@solana/signers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appEnv } from "@/constants/app-env";
import {
  findPartnerPda,
  getEnrollUserInstructionAsync,
  getStartAttemptInstructionAsync,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import {
  executeViaSwigDelegate,
  getAdminSigner,
  getPartnerAdminAddress,
  sendServerTransaction,
  uuidToBytes,
} from "@/lib/solana/admin";
import {
  findAttemptPda,
  findEnrollmentPda,
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
    const body = await req.json();
    const { walletAddress } = bodySchema.parse(body);
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
      select: { id: true, role: true, employment: { select: { id: true } } },
    });
    if (!user) {
      return NextResponse.json(
        { error: "User not found — please sign up first" },
        { status: 401 },
      );
    }

    // ── Load module ──────────────────────────────────────────────────────────
    const module = await prisma.module.findFirst({
      where: { id: moduleId, status: "ACTIVE", txConfirmed: true },
      include: {
        company: { include: { owner: true } },
        assessment: {
          include: {
            batches: { select: { id: true, label: true } },
          },
        },
      },
    });
    if (!module?.moduleIdHash || !module.company.swigAddress) {
      return NextResponse.json(
        { error: "Module not available" },
        { status: 404 },
      );
    }
    if (!module.assessment) {
      return NextResponse.json(
        { error: "Module has no assessment" },
        { status: 400 },
      );
    }

    const company = module.company;
    const partnerIdBytes = uuidToBytes(company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const [modulePda] = await findModulePda(
      partnerIdBytes,
      module.moduleIdHash,
    );
    const [enrollmentPda] = await findEnrollmentPda(
      walletAddress as Address,
      partnerIdBytes,
      module.moduleIdHash,
    );

    const employeeId =
      user.role === "EMPLOYEE" ? (user.employment?.id ?? null) : null;
    const isEmployee = employeeId !== null;

    // ── Resolve enrollment address (USER vs EMPLOYEE) ────────────────────────
    let onChainEnrollmentAddress: Address;

    if (isEmployee) {
      const assignment = await prisma.moduleAssignment.findUnique({
        where: {
          moduleId_employeeId: { moduleId, employeeId },
        },
        select: { onChainEnrollmentAddress: true },
      });
      if (!assignment) {
        return NextResponse.json({ error: "Not assigned" }, { status: 403 });
      }
      if (!assignment.onChainEnrollmentAddress) {
        return NextResponse.json(
          { error: "Assignment not yet enrolled on-chain" },
          { status: 409 },
        );
      }
      onChainEnrollmentAddress = assignment.onChainEnrollmentAddress as Address;
    } else {
      // ── Enroll user if not yet enrolled ────────────────────────────────────
      let enrollment = await prisma.moduleEnrollment.findUnique({
        where: { moduleId_userId: { moduleId, userId: user.id } },
      });

      if (!enrollment) {
        const partnerAdminWallet = await getPartnerAdminAddress(
          company.swigAddress as Address,
        );
        const enrollIx = await getEnrollUserInstructionAsync({
          partnerAdmin: createNoopSigner(partnerAdminWallet),
          user: walletAddress as Address,
          partner: partnerPda,
          module: modulePda,
          enrollment: enrollmentPda,
          reasonCode: 0,
        });
        await executeViaSwigDelegate(
          company.swigAddress as Address,
          enrollIx as never,
        );

        enrollment = await prisma.moduleEnrollment.create({
          data: {
            moduleId,
            userId: user.id,
            status: "IN_PROGRESS",
            onChainEnrollmentAddress: enrollmentPda,
          },
        });
      } else if (!enrollment.onChainEnrollmentAddress) {
        await prisma.moduleEnrollment.update({
          where: { moduleId_userId: { moduleId, userId: user.id } },
          data: {
            onChainEnrollmentAddress: enrollmentPda,
            status: "IN_PROGRESS",
          },
        });
      }

      onChainEnrollmentAddress = (enrollment?.onChainEnrollmentAddress ??
        enrollmentPda) as Address;
    }

    // Defensive: ensure the enrollment PDA exists on-chain. If the DB says it
    // exists but the account isn't initialized (e.g. prior tx failed), re-enroll.
    const rpc = createSolanaRpc(appEnv.SOLANA_RPC_URL);
    const { value: enrollmentAccount } = await rpc
      .getAccountInfo(
        onChainEnrollmentAddress as Parameters<typeof rpc.getAccountInfo>[0],
        { encoding: "base64" },
      )
      .send();
    if (!enrollmentAccount) {
      if (isEmployee) {
        return NextResponse.json(
          {
            error:
              "Assignment enrollment is missing on-chain. Ask your company admin to re-enroll you.",
          },
          { status: 409 },
        );
      }

      const partnerAdminWallet = await getPartnerAdminAddress(
        company.swigAddress as Address,
      );
      const enrollIx = await getEnrollUserInstructionAsync({
        partnerAdmin: createNoopSigner(partnerAdminWallet),
        user: walletAddress as Address,
        partner: partnerPda,
        module: modulePda,
        enrollment: enrollmentPda,
        reasonCode: 0,
      });
      await executeViaSwigDelegate(
        company.swigAddress as Address,
        enrollIx as never,
      );

      await prisma.moduleEnrollment.upsert({
        where: { moduleId_userId: { moduleId, userId: user.id } },
        update: {
          onChainEnrollmentAddress: enrollmentPda,
          status: "IN_PROGRESS",
        },
        create: {
          moduleId,
          userId: user.id,
          status: "IN_PROGRESS",
          onChainEnrollmentAddress: enrollmentPda,
        },
      });
      onChainEnrollmentAddress = enrollmentPda as Address;
    }

    // ── Resume existing unsubmitted attempt if any ───────────────────────────
    const existing = await prisma.assessmentAttempt.findFirst({
      where: isEmployee
        ? {
            assessmentId: module.assessment.id,
            employeeId,
            submittedAt: null,
          }
        : {
            assessmentId: module.assessment.id,
            userId: user.id,
            submittedAt: null,
          },
      select: { id: true, batchId: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    });
    if (existing) {
      if (!existing.batchId) {
        return NextResponse.json(
          { error: "Attempt is missing batch assignment" },
          { status: 500 },
        );
      }

      const batch = await prisma.questionBatch.findUnique({
        where: { id: existing.batchId },
        select: {
          questions: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              text: true,
              type: true,
              sortOrder: true,
              options: {
                orderBy: { sortOrder: "asc" },
                select: { id: true, text: true, sortOrder: true },
              },
            },
          },
        },
      });
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      const questions = batch.questions;
      return NextResponse.json({
        attemptId: existing.id,
        questions,
        startedAtIso: existing.startedAt.toISOString(),
        timeLimitSeconds: module.assessment.timeLimit ?? null,
      });
    }

    // ── Count previous attempts to set attempt number ────────────────────────
    const attemptCount = await prisma.assessmentAttempt.count({
      where: isEmployee
        ? { assessmentId: module.assessment.id, employeeId }
        : { assessmentId: module.assessment.id, userId: user.id },
    });
    const attemptNumber = attemptCount + 1;

    // ── Derive attempt PDA + start on-chain ──────────────────────────────────
    const [attemptPda] = await findAttemptPda(
      walletAddress as Address,
      partnerIdBytes,
      module.moduleIdHash,
    );

    const attestorSigner = await getAdminSigner();
    // `Attempt` is a singleton PDA (user + partner_id + module_id_hash). The program
    // initializes it once. Subsequent quiz starts must not re-run `StartAttempt`.
    const { value: attemptAccount } = await rpc
      .getAccountInfo(attemptPda as Parameters<typeof rpc.getAccountInfo>[0], {
        encoding: "base64",
      })
      .send();
    if (!attemptAccount) {
      const startIx = await getStartAttemptInstructionAsync({
        attestor: attestorSigner,
        user: walletAddress as Address,
        partner: partnerPda,
        module: modulePda,
        enrollment: onChainEnrollmentAddress,
        attempt: attemptPda,
      });
      await sendServerTransaction(attestorSigner, [startIx]);
    }

    const batches = module.assessment.batches;
    const randomBatch = batches[Math.floor(Math.random() * batches.length)];
    if (!randomBatch) {
      return NextResponse.json(
        { error: "Module has no question batches" },
        { status: 400 },
      );
    }

    // ── Create attempt DB record ──────────────────────────────────────────────
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: module.assessment.id,
        userId: isEmployee ? null : user.id,
        employeeId,
        attemptNumber,
        onChainAttemptAddress: attemptPda,
        batchId: randomBatch.id,
      },
    });

    const batch = await prisma.questionBatch.findUnique({
      where: { id: randomBatch.id },
      select: {
        questions: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            text: true,
            type: true,
            sortOrder: true,
            options: {
              orderBy: { sortOrder: "asc" },
              select: { id: true, text: true, sortOrder: true },
            },
          },
        },
      },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    const questions = batch.questions;

    return NextResponse.json({
      attemptId: attempt.id,
      questions,
      startedAtIso: attempt.startedAt.toISOString(),
      timeLimitSeconds: module.assessment.timeLimit ?? null,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/module/:moduleId/start]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
