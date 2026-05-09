"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { storageKeys } from "@/providers/auth-provider";
import { CredentialsList } from "./credentials-list";
import { EnrolledModulesList } from "./enrolled-modules-list";

type DashboardModule = {
  moduleId: string;
  moduleName: string;
  companyName: string;
  thumbnailUrl: string;
  status: string;
  attemptsUsed: number;
  lastAttempt: null | {
    attemptId: string;
    startedAt: string;
    submittedAt: string | null;
    score: number | null;
    scoreBps: number | null;
    passed: boolean | null;
  };
  bestScoreBps: number | null;
  credential: null | {
    id: string;
    status: string;
    issuedAt: string;
    metadataUri: string;
    scoreBps: number | null;
  };
};

type GroupedCredentials = {
  ACTIVE: Array<{
    id: string;
    moduleId: string | null;
    status: string;
    issuedAt: string;
    metadataUri: string;
    scoreBps: number | null;
  }>;
  REVOKED: Array<{
    id: string;
    moduleId: string | null;
    status: string;
    issuedAt: string;
    metadataUri: string;
    scoreBps: number | null;
  }>;
  EXPIRED: Array<{
    id: string;
    moduleId: string | null;
    status: string;
    issuedAt: string;
    metadataUri: string;
    scoreBps: number | null;
  }>;
};

export function UserDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [modules, setModules] = useState<DashboardModule[]>([]);
  const [credentials, setCredentials] = useState<GroupedCredentials>({
    ACTIVE: [],
    REVOKED: [],
    EXPIRED: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem(storageKeys.user));
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/user/dashboard?userId=${encodeURIComponent(userId)}`)
      .then(async (res) => {
        const json = (await res.json()) as {
          modules?: DashboardModule[];
          credentials?: GroupedCredentials;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard");
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        setModules(json.modules ?? []);
        setCredentials(
          json.credentials ?? { ACTIVE: [], REVOKED: [], EXPIRED: [] },
        );
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const totalCredentials = useMemo(
    () =>
      credentials.ACTIVE.length +
      credentials.REVOKED.length +
      credentials.EXPIRED.length,
    [credentials],
  );

  if (!userId) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <p className="text-sm text-muted-foreground">
          Please sign in to view your dashboard.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-10">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-md border border-border bg-card px-4 py-4 md:min-h-[88px] md:py-5">
          <p className="text-sm leading-snug text-muted-foreground">
            Enrolled modules
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums md:text-[28px] md:leading-8">
            {loading ? "—" : modules.length}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-4 md:min-h-[88px] md:py-5">
          <p className="text-sm leading-snug text-muted-foreground">
            Total credentials
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums md:text-[28px] md:leading-8">
            {loading ? "—" : totalCredentials}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-4 md:min-h-[88px] md:py-5">
          <p className="text-sm leading-snug text-muted-foreground">Active</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums md:text-[28px] md:leading-8">
            {loading ? "—" : credentials.ACTIVE.length}
          </p>
        </div>
      </section>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="manual" className="mt-8 w-full gap-6 md:mt-10">
        <TabsList className={"bg-transparent gap-2.5"}>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-6 md:mt-8">
          <EnrolledModulesList loading={loading} modules={modules} />
        </TabsContent>

        <TabsContent value="credentials" className="mt-6 md:mt-8">
          <CredentialsList loading={loading} credentials={credentials} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
