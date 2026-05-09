"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { appEnv } from "@/constants/app-env";
import type { QuizBalance } from "@/hooks/use-quiz-balance";
import {
  CATEGORY_OPTIONS,
  MODULE_TYPE_OPTIONS,
  type ModuleWithQuizInput,
} from "@/lib/validations/module-schema";

const LOW_QUIZ_BALANCE_THRESHOLD = 10;

interface ModuleReviewPaneProps {
  onSave?: () => void;
  quizBalance?: QuizBalance | null;
  quizBalanceLoading?: boolean;
}

export default function ModuleReviewPane({
  onSave,
  quizBalance,
  quizBalanceLoading,
}: ModuleReviewPaneProps) {
  const values = useWatch<ModuleWithQuizInput>();
  const { formState } = useFormContext<ModuleWithQuizInput>();

  const titleDisplay = values.title?.trim() || "—";
  const categoryDisplay =
    CATEGORY_OPTIONS.find((c) => c.value === values.category)?.label ?? "—";
  const moduleTypeDisplay =
    MODULE_TYPE_OPTIONS.find((o) => o.value === values.moduleType)?.label ??
    "—";
  const passingScoreDisplay =
    typeof values.passingScore === "number" &&
    !Number.isNaN(values.passingScore)
      ? `${values.passingScore}%`
      : "—";

  const quizTimeLimitDisplay =
    typeof values.quizTimeLimitMinutes === "number" &&
    Number.isFinite(values.quizTimeLimitMinutes) &&
    values.quizTimeLimitMinutes > 0
      ? `${values.quizTimeLimitMinutes} min`
      : "Unlimited";

  const cooldownDisplay =
    typeof values.cooldownHours === "number" &&
    Number.isFinite(values.cooldownHours)
      ? values.cooldownHours === 0
        ? "None"
        : `${values.cooldownHours} hr`
      : "—";

  const credentialExpiryDisplay =
    typeof values.credentialExpiryMonths === "number" &&
    Number.isFinite(values.credentialExpiryMonths) &&
    values.credentialExpiryMonths > 0
      ? `${values.credentialExpiryMonths} months`
      : "Never";

  const recipients =
    typeof values.recipients === "number" && Number.isFinite(values.recipients)
      ? values.recipients
      : Number(values.recipients);

  const recipientsCount = Number.isFinite(recipients)
    ? Math.max(0, recipients)
    : 0;

  const remainingQuizzes = quizBalance?.remaining ?? null;
  const quizWarning = (() => {
    if (quizBalanceLoading || remainingQuizzes == null) return null;
    if (remainingQuizzes === 0) {
      return {
        tone: "danger" as const,
        title: "No quiz allocations available",
        body: "You currently have 0 quizzes allocated. Allocate quizzes from your company vault before learners can take this module.",
      };
    }
    if (recipientsCount > 0 && remainingQuizzes < recipientsCount) {
      const shortfall = recipientsCount - remainingQuizzes;
      return {
        tone: "danger" as const,
        title: `Only ${remainingQuizzes} quizzes remaining`,
        body: `This module is set to ${recipientsCount} recipients but you only have ${remainingQuizzes} quizzes available. Allocate ${shortfall} more, or reduce the recipient count.`,
      };
    }
    if (remainingQuizzes < LOW_QUIZ_BALANCE_THRESHOLD) {
      return {
        tone: "warn" as const,
        title: `Low quiz balance: ${remainingQuizzes} remaining`,
        body: "You're running low on quiz allocations. Consider allocating more from your company vault.",
      };
    }
    return null;
  })();
  const usdTotal = recipientsCount * 1;
  const usdDisplay = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usdTotal);

  const solUsd = Number(appEnv.SOL_USD);
  const solTotal =
    Number.isFinite(solUsd) && solUsd > 0 ? usdTotal / solUsd : null;
  const solDisplay = solTotal !== null ? `${solTotal.toFixed(4)} SOL` : "— SOL";

  return (
    <aside className="flex w-full max-w-[420px] flex-col gap-8">
      <div className="flex flex-col gap-2.5">
        <div className="flex w-[280px] flex-col">
          <h2 className="text-base font-semibold leading-6 text-ink-strong">
            Review &amp; Publish
          </h2>
          <p className="text-xs font-light leading-6 text-ink-mute">
            Everything looks good? Publish to make it live
          </p>
        </div>

        <div className="flex w-full flex-col gap-6 rounded-lg border border-foreground/90 px-3.5 py-4 text-xs text-ink-subtle">
          <div className="flex flex-col gap-5">
            <ReviewRow label="Title" value={titleDisplay} />
            <ReviewRow label="Module Type" value={moduleTypeDisplay} />
            <ReviewRow label="Category" value={categoryDisplay} />
            <ReviewRow
              label="Completion Time"
              value={values.completionTime ?? "—"}
            />
            <ReviewRow label="Language" value={values.language ?? "—"} />
            <ReviewRow label="Passing Score" value={passingScoreDisplay} />
            <ReviewRow
              label="Recipients"
              value={values.recipients?.toString() ?? "—"}
            />
            <ReviewRow label="Quiz Time Limit" value={quizTimeLimitDisplay} />
            <ReviewRow label="Retry Cooldown" value={cooldownDisplay} />
            <ReviewRow
              label="Credential Expiry"
              value={credentialExpiryDisplay}
            />
          </div>
          <div className="flex items-center justify-between font-display font-semibold">
            <span>Payment</span>
            <div className="flex flex-col items-end leading-tight">
              <span>{usdDisplay}</span>
              <span className="text-[11px] font-light text-ink-mute">
                ≈ {solDisplay}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-foreground/90 bg-foreground/4 px-2.5 py-1.5">
          <p className="text-xs font-light leading-6 text-foreground">
            Publishing will make this module visible to all customers on
            RegtechX. A small platform fee (5%) applies to each enrolment.
          </p>
        </div>

        {quizWarning ? (
          <output
            className={
              quizWarning.tone === "danger"
                ? "block rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                : "block rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-xs"
            }
          >
            <p className="font-semibold">{quizWarning.title}</p>
            <p className="mt-0.5 leading-snug">{quizWarning.body}</p>
          </output>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onSave}
          disabled={formState.isSubmitting}
        >
          Save
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={formState.isSubmitting}
        >
          Publish
        </Button>
      </div>
    </aside>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-display font-light">{label}</span>
      <span className="truncate text-right font-display">{value}</span>
    </div>
  );
}
