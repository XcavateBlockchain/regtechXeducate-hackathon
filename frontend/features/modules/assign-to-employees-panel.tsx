"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/hooks/use-company";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";

type Employee = {
  id: string;
  user: { id: string; name: string; email: string };
  permission: string;
};

export function AssignToEmployeesPanel({ moduleId }: { moduleId: string }) {
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const { company } = useCompany(slug, address);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !address) return;
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/company/${encodeURIComponent(slug)}/employees?walletAddress=${encodeURIComponent(address)}`,
    )
      .then(async (res) => {
        const json = (await res.json()) as {
          employees?: Array<{
            id: string;
            permission: string;
            user: { id: string; name: string; email: string };
          }>;
        };
        if (!res.ok) return { employees: [] as Employee[] };
        return { employees: (json.employees ?? []) as Employee[] };
      })
      .then((data) => {
        if (cancelled) return;
        setEmployees(data.employees);
        setSelected({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, address]);

  const selectedUserIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected],
  );

  async function assign() {
    if (!slug || !company || !address || selectedUserIds.length === 0) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/company/${encodeURIComponent(slug)}/modules/${encodeURIComponent(moduleId)}/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: company.id,
            walletAddress: address,
            employeeUserIds: selectedUserIds,
          }),
        },
      );
      const json = (await res.json()) as {
        results?: { ok: boolean }[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Assignment failed");
      const ok = (json.results ?? []).filter((r) => r.ok).length;
      setMessage(`${ok} assignment(s) sent`);
      setSelected({});
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Assign to employees
          </h2>
          <p className="text-xs text-muted-foreground">
            Select employees to assign this module.
          </p>
        </div>
        <Button
          type="button"
          onClick={assign}
          disabled={
            !company || !address || submitting || selectedUserIds.length === 0
          }
        >
          {submitting ? "Assigning…" : "Assign"}
        </Button>
      </div>

      {loading ? (
        <div className="mt-3 text-sm text-muted-foreground">
          Loading employees…
        </div>
      ) : employees.length ? (
        <ul className="mt-3 flex flex-col gap-2">
          {employees.map((e) => (
            <li key={e.user.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={!!selected[e.user.id]}
                onChange={() =>
                  setSelected((p) => ({ ...p, [e.user.id]: !p[e.user.id] }))
                }
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">
                  {e.user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.user.email} · {e.permission}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No employees found.
        </p>
      )}

      {message ? (
        <p className="mt-3 text-xs text-muted-foreground">{message}</p>
      ) : null}
    </section>
  );
}
