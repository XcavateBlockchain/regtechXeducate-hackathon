import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  userId: z.string().min(8),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
    const { searchParams } = new URL(req.url);
    const { userId } = querySchema.parse({
      userId: searchParams.get("userId") ?? "",
    });

    const user = await prisma.user.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const employee =
      user.role === "EMPLOYEE"
        ? await prisma.employee.findUnique({
            where: { userId: user.id },
            select: { id: true },
          })
        : null;

    const attempt = await prisma.assessmentAttempt.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(employee?.id ? [{ employeeId: employee.id }] : []),
        ],
        submittedAt: { not: null },
        assessment: { moduleId },
      },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        startedAt: true,
        submittedAt: true,
        score: true,
        onChainScoreBps: true,
        passed: true,
        answers: {
          select: {
            questionId: true,
            selectedOptions: true,
            question: {
              select: {
                text: true,
                options: { select: { id: true, text: true } },
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ attempt: null }, { status: 200 });
    }

    const questions = attempt.answers.map((a) => {
      const selectedSet = new Set(a.selectedOptions);
      const selected = a.question.options
        .filter((o) => selectedSet.has(o.id))
        .map((o) => ({ optionId: o.id, text: o.text }));
      return {
        questionId: a.questionId,
        text: a.question.text,
        selectedOptions: selected,
      };
    });

    return NextResponse.json(
      {
        attempt: {
          attemptId: attempt.id,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          score: attempt.score,
          scoreBps: attempt.onChainScoreBps,
          passed: attempt.passed,
          questions,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[GET /api/user/modules/:moduleId/last-attempt]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
