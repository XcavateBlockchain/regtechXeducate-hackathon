"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";

type TeamStat = { value: string; label: string };
type TeamLog = { label: string; time: string };

type ApiLog = {
  id: string;
  type: string;
  metadata: unknown;
  createdAt: string;
};

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function TeamActivity() {
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const [stats, setStats] = useState<{
    activeEmployees: number;
    modulesThisWeek: number;
    logs: ApiLog[];
  } | null>(null);

  useEffect(() => {
    if (!slug || !address) return;
    let cancelled = false;
    fetch(
      `/api/company/${encodeURIComponent(slug)}/team-activity?walletAddress=${encodeURIComponent(address)}`,
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          activeEmployees: number;
          modulesThisWeek: number;
          logs: ApiLog[];
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

  const teamStats: TeamStat[] = useMemo(
    () => [
      { value: String(stats?.activeEmployees ?? 0), label: "Active employees" },
      {
        value: String(stats?.modulesThisWeek ?? 0),
        label: "Modules this week",
      },
    ],
    [stats],
  );

  const teamLog: TeamLog[] = useMemo(() => {
    const logs = stats?.logs ?? [];
    return logs.map((l) => {
      const meta = (l.metadata ?? {}) as Record<string, unknown>;
      const moduleName = (meta.moduleName as string | undefined) ?? "—";
      const label =
        l.type === "MODULE_PUBLISHED"
          ? `Published ${moduleName}`
          : l.type === "MODULE_CREATED"
            ? `Created ${moduleName}`
            : l.type;
      return { label, time: timeAgo(l.createdAt) };
    });
  }, [stats]);

  return (
    <Card className="flex flex-col gap-[54px] px-6 py-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center font-sans text-[#545454] justify-between">
          <h2 className="text-base font-semibold leading-6 font-sans text-[#545454]">
            Recent activity
          </h2>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-[18px] py-1 text-sm leading-6 text-ink-strong transition-colors hover:text-foreground"
          >
            Manage
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {teamStats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center gap-2.5 rounded-[10px] bg-[#f8f8f8] px-7 py-6"
            >
              <span className="text-2xl font-semibold leading-6 text-ink-strong">
                {stat.value}
              </span>
              <span className="text-sm leading-6 text-ink-mute">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ul className="flex flex-col gap-4 text-sm leading-6 text-[#959583]">
        {teamLog.map((entry) => (
          <li key={entry.label} className="flex items-center justify-between">
            <span>{entry.label}</span>
            <span>{entry.time}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
