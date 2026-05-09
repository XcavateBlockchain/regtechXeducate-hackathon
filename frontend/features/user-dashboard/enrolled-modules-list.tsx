"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { storageKeys } from "@/providers/auth-provider";

type DashboardModule = {
  moduleId: string;
  moduleName: string;
  companyName: string;
  thumbnailUrl: string;
  status: string;
  attemptsUsed: number;
  avgScoreBps?: number | null;
  lastAttempt: null | {
    score: number | null;
    scoreBps: number | null;
    passed: boolean | null;
    startedAt: string;
  };
  bestScoreBps: number | null;
  credential: null | { status: string };
};

function fmtPctFromBps(bps: number | null) {
  if (typeof bps !== "number") return "—";
  return `${Math.round(bps / 100)}%`;
}

function fmtDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export function EnrolledModulesList({
  loading,
  modules,
}: {
  loading: boolean;
  modules: DashboardModule[];
}) {
  const [answersOpen, setAnswersOpen] = useState(false);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<null | {
    attemptId: string;
    submittedAt: string;
    scoreBps: number | null;
    passed: boolean | null;
    questions: Array<{
      questionId: string;
      text: string;
      selectedOptions: Array<{ optionId: string; text: string }>;
    }>;
  }>(null);

  async function openLastAttemptAnswers(moduleId: string) {
    const userId = localStorage.getItem(storageKeys.user);
    if (!userId) return;
    setAnswersOpen(true);
    setAnswersLoading(true);
    setAnswersError(null);
    setAnswers(null);
    try {
      const res = await fetch(
        `/api/user/modules/${encodeURIComponent(moduleId)}/last-attempt?userId=${encodeURIComponent(userId)}`,
      );
      const json = (await res.json()) as {
        attempt?: typeof answers;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load attempt");
      setAnswers(json.attempt ?? null);
    } catch (e) {
      setAnswersError(
        e instanceof Error ? e.message : "Failed to load attempt",
      );
    } finally {
      setAnswersLoading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading modules…</p>;
  }

  if (!modules.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No enrollments yet. Use a module link shared with you to enroll.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {modules.map((m) => (
          <li
            key={m.moduleId}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {m.moduleName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.companyName} · {m.status}
                  {m.credential ? ` · Credential: ${m.credential.status}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Attempts: {m.attemptsUsed}</span>
                  <span>Avg: {fmtPctFromBps(m.avgScoreBps ?? null)}</span>
                  <span>
                    Last score:{" "}
                    {m.lastAttempt?.scoreBps != null
                      ? fmtPctFromBps(m.lastAttempt.scoreBps)
                      : m.lastAttempt?.score != null
                        ? `${m.lastAttempt.score}%`
                        : "—"}
                  </span>
                  <span>
                    Result:{" "}
                    {m.lastAttempt?.passed == null
                      ? "—"
                      : m.lastAttempt.passed
                        ? "Pass"
                        : "Fail"}
                  </span>
                  <span>Best: {fmtPctFromBps(m.bestScoreBps)}</span>
                  <span>
                    Last activity:{" "}
                    {m.lastAttempt ? fmtDate(m.lastAttempt.startedAt) : "—"}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  nativeButton={false}
                  render={<Link href={`/module/${m.moduleId}`}>Continue</Link>}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openLastAttemptAnswers(m.moduleId)}
                >
                  Last attempt answers
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={answersOpen} onOpenChange={setAnswersOpen}>
        <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Last attempt answers</DialogTitle>
            <DialogDescription>
              Selected options for your most recent submitted attempt.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {answersLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : answersError ? (
              <p className="text-sm text-destructive">{answersError}</p>
            ) : !answers ? (
              <p className="text-sm text-muted-foreground">
                No submitted attempt found for this module yet.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  Score: {fmtPctFromBps(answers.scoreBps)} · Result:{" "}
                  {answers.passed == null
                    ? "—"
                    : answers.passed
                      ? "Pass"
                      : "Fail"}
                </div>
                <ol className="space-y-3">
                  {answers.questions.map((q, idx) => (
                    <li key={q.questionId} className="rounded-lg border p-3">
                      <p className="text-sm font-medium text-foreground">
                        {idx + 1}. {q.text}
                      </p>
                      {q.selectedOptions.length ? (
                        <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                          {q.selectedOptions.map((o) => (
                            <li key={o.optionId}>{o.text}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          No answer selected.
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
