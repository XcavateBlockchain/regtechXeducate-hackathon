"use client";

import { useCallback, useEffect, useState } from "react";
import { AddEmployeeDialog } from "@/features/team/add-employee-dialog";
import { EmployeeList } from "@/features/team/employee-list";
import { InviteList } from "@/features/team/invite-list";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";

type ApiInvite = {
  id: string;
  email: string;
  inviteeName: string | null;
  permission: string;
  token: string;
  expiresAt: string;
  claimedAt: string | null;
  claimedBy: string | null;
  createdAt: string;
};

type ApiEmployee = {
  id: string;
  permission: string;
  department: string | null;
  jobTitle: string | null;
  joinedAt: string;
  user: {
    id: string;
    userId: string;
    name: string;
    email: string;
    walletAddress: string;
  };
};

export function TeamManager() {
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const [invites, setInvites] = useState<ApiInvite[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!slug || !address) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(
        `/api/company/${encodeURIComponent(slug)}/invites?walletAddress=${encodeURIComponent(address)}`,
      ),
      fetch(
        `/api/company/${encodeURIComponent(slug)}/employees?walletAddress=${encodeURIComponent(address)}`,
      ),
    ])
      .then(async ([invRes, empRes]) => {
        const invJson = (await invRes.json()) as {
          invites?: ApiInvite[];
        };
        const empJson = (await empRes.json()) as {
          employees?: ApiEmployee[];
        };
        if (!cancelled) {
          setInvites(invJson.invites ?? []);
          setEmployees(empJson.employees ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInvites([]);
          setEmployees([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, address]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  return (
    <main className="flex flex-col gap-6 px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground">
            Invite employees and manage permissions.
          </p>
        </div>
        <AddEmployeeDialog onCreated={load} />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EmployeeList employees={employees} />
          <InviteList invites={invites} />
        </div>
      )}
    </main>
  );
}
