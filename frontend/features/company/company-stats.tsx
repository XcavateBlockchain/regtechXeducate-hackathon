"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { cn } from "@/lib/utils";

type Delta = {
  value: string;
  tone: "success" | "muted";
};

type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  delta: Delta;
};

function StatCard({ label, value, unit, delta }: StatCardProps) {
  return (
    <Card className="flex flex-1 flex-col gap-5 px-6 py-6">
      <p className="text-sm uppercase text-ink-mute">{label}</p>
      <div className="flex flex-col gap-2.5">
        <p className="text-2xl font-semibold leading-6 text-ink-strong">
          {value}
          {unit && (
            <span className="ml-1 text-base font-normal leading-6">{unit}</span>
          )}
        </p>
        <p
          className={cn(
            "text-sm leading-6",
            delta.tone === "success" ? "text-status-success" : "text-ink-mute",
          )}
        >
          {delta.value}
        </p>
      </div>
    </Card>
  );
}

export function CompanyStats() {
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const [stats, setStats] = useState<{
    activeModules: number;
    credentialsIssued: number;
    employees: number;
    publicEnrolled: number;
    totalEnrolments: number;
  } | null>(null);

  useEffect(() => {
    if (!slug || !address) return;
    let cancelled = false;
    fetch(
      `/api/company/${encodeURIComponent(slug)}/stats?walletAddress=${encodeURIComponent(address)}`,
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          activeModules: number;
          credentialsIssued: number;
          employees: number;
          publicEnrolled: number;
          totalEnrolments: number;
        }>;
      })
      .then((data) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, address]);

  const valueOrDash = (v: number | undefined) =>
    typeof v === "number" ? String(v) : "—";

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Active Modules"
        value={valueOrDash(stats?.activeModules)}
        unit="Modules"
        delta={{ value: "Live", tone: "muted" }}
      />
      <StatCard
        label="Credentials issued"
        value={valueOrDash(stats?.credentialsIssued)}
        delta={{ value: "Live", tone: "muted" }}
      />
      <StatCard
        label="Employees"
        value={valueOrDash(stats?.employees)}
        delta={{ value: "Live", tone: "muted" }}
      />
      <StatCard
        label="Public enrolled"
        value={valueOrDash(stats?.publicEnrolled)}
        delta={{ value: "Live", tone: "muted" }}
      />
      <StatCard
        label="Total enrolments"
        value={valueOrDash(stats?.totalEnrolments)}
        delta={{ value: "Live", tone: "muted" }}
      />
    </div>
  );
}
