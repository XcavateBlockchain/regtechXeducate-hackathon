"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/providers/auth-provider";

type StepTone = "info" | "brand" | "success";

type Step = {
  label: string;
  tone: StepTone;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    label: "Step 1",
    tone: "info",
    title: "Companies publish",
    description:
      "Organisations upload regulatory learning modules from verified sources  that are targeting specific knowledge to be demonstrated.",
  },
  {
    label: "Step 2",
    tone: "brand",
    title: "Audited learn",
    description:
      "Employees / customers complete each module taking a AI generated personalised quiz at the end to establish level of understanding.",
  },
  {
    label: "Step 3",
    tone: "success",
    title: "Impact unlocked",
    description:
      "On successfully passing the module(s), companies demonstrate employees and customers have verifiable regulatory compliant knowledge.",
  },
];

const stepBadgeStyles: Record<StepTone, string> = {
  info: "bg-[#ebf1fd] text-[#1f5fe8]",
  brand: "bg-brand-soft text-brand",
  success: "bg-[#dcfce7] text-[#3bb468]",
};

export function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Top + bottom soft glows. Pure CSS — no asset URL that
          can expire. The two blurred radial gradients sit behind
          the hero (top) and behind the steps (bottom). */}
      <GlowField position="top" />
      <GlowField position="bottom" />

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col items-center gap-24 px-6 py-24 lg:py-32">
        <Hero />
        <HowItWorks />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Hero
--------------------------------------------------------------- */

function Hero() {
  const { setOpen } = useAuthContext();
  const { user } = useUser();
  return (
    <section className="flex w-full max-w-[626px] flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-[10px] bg-primary/10 px-2 py-0.5 text-xs leading-normal text-primary">
          Regulatory Compliance Reimagined
        </span>
        <h1 className="text-[#545454] text-[50px] font-extrabold leading-tight">
          Verifiable digital asset regulated learning
        </h1>
      </div>

      <p className="max-w-[420px] text-sm leading-6 text-[#545454]">
        Real-time verifiable proof of learning on any digital asset or
        regulatory framework. Reducing the risk for companies while improving
        the outcome for employees and customers
      </p>

      {user ? (
        <Link
          href={user.role === "OWNER" ? `/${user.company?.slug}` : "/dashboard"}
        >
          <Button>Dashboard</Button>
        </Link>
      ) : (
        <Button onClick={() => setOpen(true)} className="px-9">
          Get Started
        </Button>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------
   How it works
--------------------------------------------------------------- */

function HowItWorks() {
  return (
    <section className="flex w-full max-w-[1016px] flex-col items-center gap-[78px]">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-display text-xs uppercase tracking-[0.33em] text-[#959583]">
          How it works
        </p>
        <h2 className="text-lg font-bold text-ink-strong">
          Three steps to compliance
        </h2>
      </div>

      <div className="grid w-full grid-cols-1 gap-7 md:grid-cols-3">
        {steps.map((step) => (
          <StepCard key={step.label} step={step} />
        ))}
      </div>
    </section>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <article className="flex flex-col gap-6 rounded-lg border border-border bg-background/60 px-3.5 py-4 backdrop-blur-sm">
      <div className="flex flex-col items-start gap-6">
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-[10px] px-2 py-0.5 text-xs font-medium leading-normal",
            stepBadgeStyles[step.tone],
          )}
        >
          {step.label}
        </span>
        <h3 className="font-display text-sm font-extrabold leading-normal text-ink-strong">
          {step.title}
        </h3>
      </div>
      <p className="font-display text-sm leading-6 text-ink-subtle">
        {step.description}
      </p>
    </article>
  );
}

function GlowField({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 z-0 h-[420px] w-[1100px] -translate-x-1/2",
        position === "top" ? "top-[-80px]" : "bottom-[-80px]",
      )}
    >
      <div
        className="size-full opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(178, 115, 255, 0.28) 0%, rgba(98, 71, 129, 0.14) 35%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
    </div>
  );
}
