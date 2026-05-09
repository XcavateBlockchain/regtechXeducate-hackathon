"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { cn } from "@/lib/utils";

type Category = "Securities" | "AML" | "DeFi" | "KYC";
type Status = "Published" | "Draft" | "Failed";

type Module = {
  id: string;
  title: string;
  category: Category;
  tested: string;
  passRate: string;
  failRate: string;
  status: Status;
  passTone: "success" | "warning" | "neutral";
  failTone: "danger" | "danger-bright" | "neutral";
};

type LearnerRow = {
  name: string;
  email: string;
  walletAddress: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  finalScoreBps: number | null;
  kind: "employee" | "user";
};

function toCategory(raw: string): Category {
  const upper = raw.toUpperCase();
  if (upper === "AML") return "AML";
  if (upper === "KYC") return "KYC";
  if (upper === "DEFI") return "DeFi";
  return "Securities";
}

function toStatus(raw: string): Status {
  const upper = raw.toUpperCase();
  if (upper === "DRAFT") return "Draft";
  if (upper === "ARCHIVED") return "Failed";
  return "Published";
}

function toneForPassRate(passRate: number): Module["passTone"] {
  if (passRate >= 85) return "success";
  if (passRate >= 70) return "warning";
  return "neutral";
}

function toneForFailRate(failRate: number): Module["failTone"] {
  if (failRate >= 30) return "danger-bright";
  if (failRate > 0) return "danger";
  return "neutral";
}

const categoryToneMap: Record<
  Category,
  Parameters<typeof Badge>[0]["variant"]
> = {
  Securities: "default",
  AML: "default",
  DeFi: "default",
  KYC: "default",
};

const statusToneMap: Record<Status, Parameters<typeof Badge>[0]["variant"]> = {
  Published: "default",
  Draft: "default",
  Failed: "default",
};

const passToneMap = {
  success: "text-status-success",
  warning: "text-status-warning",
  neutral: "text-ink-mute",
};

const failToneMap = {
  danger: "text-status-danger-bar",
  "danger-bright": "text-status-danger-bright",
  neutral: "text-ink-mute",
};

export function ModulesPerformance() {
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const [modules, setModules] = useState<Module[]>([]);
  const [open, setOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [learnersLoading, setLearnersLoading] = useState(false);

  useEffect(() => {
    if (!slug || !address) return;
    let cancelled = false;
    fetch(
      `/api/company/${encodeURIComponent(slug)}/modules-performance?walletAddress=${encodeURIComponent(address)}`,
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          modules: Array<{
            id: string;
            name: string;
            category: string;
            status: string;
            tested: number;
            passRate: number;
            failRate: number;
          }>;
        }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        const rows: Module[] = data.modules.map((m) => ({
          id: m.id,
          title: m.name,
          category: toCategory(m.category),
          tested: String(m.tested ?? 0),
          passRate: `${Math.round(m.passRate ?? 0)}%`,
          failRate: `${Math.round(m.failRate ?? 0)}%`,
          status: toStatus(m.status),
          passTone: toneForPassRate(m.passRate ?? 0),
          failTone: toneForFailRate(m.failRate ?? 0),
        }));
        setModules(rows);
      })
      .catch(() => {
        if (!cancelled) setModules([]);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, address]);

  useEffect(() => {
    if (!open || !slug || !activeModule?.id || !address) return;
    let cancelled = false;
    setLearnersLoading(true);
    fetch(
      `/api/company/${encodeURIComponent(slug)}/modules/${encodeURIComponent(activeModule.id)}/learners?walletAddress=${encodeURIComponent(address)}`,
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          employees: Array<{
            name: string;
            email: string;
            walletAddress: string;
            status: string;
            enrolledAt: string;
            completedAt: string | null;
            finalScoreBps: number | null;
          }>;
          users: Array<{
            name: string;
            email: string;
            walletAddress: string;
            status: string;
            enrolledAt: string;
            completedAt: string | null;
            finalScoreBps: number | null;
          }>;
        }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        const combined: LearnerRow[] = [
          ...data.employees.map((l) => ({
            ...l,
            kind: "employee" as const,
          })),
          ...data.users.map((l) => ({ ...l, kind: "user" as const })),
        ].sort((a, b) => (a.enrolledAt < b.enrolledAt ? 1 : -1));
        setLearners(combined);
      })
      .catch(() => {
        if (!cancelled) setLearners([]);
      })
      .finally(() => {
        if (!cancelled) setLearnersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, slug, activeModule?.id, address]);

  return (
    <Card className="p-4">
      <h2 className="mb-4 font-display text-base font-semibold leading-6 text-ink-strong">
        Modules performance
      </h2>

      <Table>
        <TableHeader>
          <TableRow className="bg-[#959583]/8 hover:bg-[rgba(149,149,131,0.08)] border-transparent">
            <TableHead className="w-[28%]">Title</TableHead>
            <TableHead className="w-[14%]">Category</TableHead>
            <TableHead className="w-[10%]">Tested</TableHead>
            <TableHead className="w-[12%]">Pass rate</TableHead>
            <TableHead className="w-[12%]">Fail rate</TableHead>
            <TableHead className="w-[14%]">Status</TableHead>
            <TableHead className="w-[10%] text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-ink-strong">{m.title}</TableCell>
              <TableCell>
                <Badge variant={categoryToneMap[m.category]}>
                  {m.category}
                </Badge>
              </TableCell>
              <TableCell className="text-ink-strong">{m.tested}</TableCell>
              <TableCell className={cn(passToneMap[m.passTone])}>
                {m.passRate}
              </TableCell>
              <TableCell className={cn(failToneMap[m.failTone])}>
                {m.failRate}
              </TableCell>
              <TableCell>
                <Badge variant={statusToneMap[m.status]}>{m.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <button
                  type="button"
                  className="font-medium text-action-link transition-colors hover:underline"
                  onClick={() => {
                    setActiveModule({ id: m.id, title: m.title });
                    setOpen(true);
                  }}
                >
                  View learners
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setActiveModule(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Module learners</DialogTitle>
            <DialogDescription>{activeModule?.title ?? "—"}</DialogDescription>
          </DialogHeader>

          {learnersLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : learners.length ? (
            <div className="max-h-[420px] overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {learners.map((l) => (
                    <tr
                      key={`${l.kind}-${l.walletAddress}`}
                      className="border-b"
                    >
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {l.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {l.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {l.kind === "employee" ? "Employee" : "User"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {l.status}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {typeof l.finalScoreBps === "number"
                          ? `${Math.round(l.finalScoreBps / 100)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No learners enrolled yet.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
