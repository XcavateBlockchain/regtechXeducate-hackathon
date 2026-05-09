"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { cn } from "@/lib/utils";

type ActivityStatus = "info" | "success" | "danger";

type ActivityRow = {
  initials: string;
  name: string;
  module: string;
  status: ActivityStatus;
  statusLabel: string;
  time: string;
};

type ApiLog = {
  id: string;
  type: string;
  metadata: unknown;
  createdAt: string;
  actor: { name: string };
};

const statusColors: Record<ActivityStatus, string> = {
  info: "text-ink-mute",
  success: "text-status-success",
  danger: "text-status-danger",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "—";
}

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

export function RecentActivities() {
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const [logs, setLogs] = useState<ApiLog[]>([]);

  useEffect(() => {
    if (!slug || !address) return;
    let cancelled = false;
    fetch(
      `/api/company/${encodeURIComponent(slug)}/activity?walletAddress=${encodeURIComponent(address)}`,
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ logs: ApiLog[] }>;
      })
      .then((data) => {
        if (!cancelled && data) setLogs(data.logs);
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, address]);

  const activities = useMemo<ActivityRow[]>(() => {
    return logs.map((log) => {
      const meta = (log.metadata ?? {}) as Record<string, unknown>;
      const moduleName =
        (meta.moduleName as string | undefined) ??
        (meta.moduleTitle as string | undefined) ??
        "—";

      const actorName = log.actor?.name ?? "—";
      if (log.type === "MODULE_PUBLISHED") {
        return {
          initials: initials(actorName),
          name: actorName,
          module: moduleName,
          status: "success",
          statusLabel: "Published",
          time: timeAgo(log.createdAt),
        };
      }
      if (log.type === "MODULE_CREATED") {
        return {
          initials: initials(actorName),
          name: actorName,
          module: moduleName,
          status: "info",
          statusLabel: "Draft created",
          time: timeAgo(log.createdAt),
        };
      }
      return {
        initials: initials(actorName),
        name: actorName,
        module: moduleName,
        status: "info",
        statusLabel: log.type,
        time: timeAgo(log.createdAt),
      };
    });
  }, [logs]);

  return (
    <Card className="flex flex-col gap-4 px-6 py-4 rounded-[10px]">
      <div className="flex items-center font-sans  text-[#545454] justify-between">
        <h2 className="text-base font-semibold leading-6 ">
          Recent activities
        </h2>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-[18px] py-1 text-sm leading-6 text-ink-strong transition-colors hover:text-foreground"
        >
          View all
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </button>
      </div>

      <ul className="flex flex-col">
        {activities.map((activity, idx) => (
          <li
            key={`${activity.name}-${idx}`}
            className="flex items-center justify-between py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <Avatar className={"size-12"}>
                <AvatarFallback>{activity.initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm leading-6">
                <span className="font-semibold text-ink-strong">
                  {activity.name}
                </span>
                <span className="text-ink-mute">{activity.module}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs leading-none">
              <span className={cn(statusColors[activity.status])}>
                {activity.statusLabel}
              </span>
              <span className="text-ink-mute">{activity.time}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
