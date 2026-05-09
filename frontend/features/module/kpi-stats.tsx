"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { cn } from "@/lib/utils";

type Analytics = {
  totalEnrolments: number;
  passRate: number;
  failRate: number;
  thisWeek: { newPasses: number };
  lastMonth: { delta: number; passRate: number };
};

export function KpiStats({
  moduleId,
  moduleName,
  fileUrl,
}: {
  moduleId: string;
  moduleName: string;
  fileUrl?: string | null;
}) {
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    if (!slug || !address) return;
    let cancelled = false;
    fetch(
      `/api/company/${encodeURIComponent(slug)}/modules/${encodeURIComponent(moduleId)}/analytics?walletAddress=${encodeURIComponent(address)}`,
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<Analytics>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, address, moduleId]);

  const passRate = data?.passRate;
  const failRate = data?.failRate;
  const totalEnrolments = data?.totalEnrolments;
  const thisWeekNewPasses = data?.thisWeek?.newPasses;
  const lastMonthDelta = data?.lastMonth?.delta;

  const fmtPct = (v: number | undefined) =>
    typeof v === "number" ? `${Math.round(v)}%` : "—";
  const fmtNum = (v: number | undefined) =>
    typeof v === "number" ? String(v) : "—";
  const fmtSignedPct = (v: number | undefined) =>
    typeof v === "number"
      ? `${v >= 0 ? "+" : ""}${Math.round(v)}% Last month`
      : "—";

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Passed users"
        value={fmtPct(passRate)}
        delta={
          typeof thisWeekNewPasses === "number"
            ? `+${thisWeekNewPasses} this week`
            : "—"
        }
        deltaTone="success"
      />
      <KpiCard
        label="Failed user"
        value={fmtPct(failRate)}
        valueSuffix="Pass"
        delta={fmtSignedPct(lastMonthDelta)}
        deltaTone={
          typeof lastMonthDelta === "number" && lastMonthDelta < 0
            ? "muted"
            : "success"
        }
      />
      <KpiCard
        label="Total enrolments"
        value={fmtNum(totalEnrolments)}
        delta={"Live"}
        deltaTone="muted"
      />
      <Card className="flex flex-col gap-5 px-6 py-6">
        <p className="text-sm uppercase text-ink-mute">The module</p>
        <div className="flex flex-col gap-2.5">
          <p className="text-base leading-6 text-ink-strong">{moduleName}</p>
          {fileUrl ? (
            <Link
              href={fileUrl}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm leading-6 text-brand transition-colors hover:underline"
            >
              <FileText className="size-3.5" strokeWidth={1.75} />
              View file
            </Link>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  valueSuffix,
  delta,
  deltaTone,
}: {
  label: string;
  value: string;
  valueSuffix?: string;
  delta: string;
  deltaTone: "success" | "muted";
}) {
  return (
    <Card className="flex flex-col gap-5 px-6 py-6">
      <p className="text-sm uppercase text-ink-mute">{label}</p>
      <div className="flex flex-col gap-2.5">
        <p className="text-2xl font-semibold leading-6 text-ink-strong">
          {value}
          {valueSuffix && (
            <span className="ml-1 text-base font-normal leading-6">
              {valueSuffix}
            </span>
          )}
        </p>
        <p
          className={cn(
            "text-sm leading-6",
            deltaTone === "success" ? "text-status-success" : "text-ink-mute",
          )}
        >
          {delta}
        </p>
      </div>
    </Card>
  );
}
