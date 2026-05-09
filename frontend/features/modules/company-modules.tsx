"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModuleCardData } from "@/features/modules/module-item";
import { ModuleList } from "@/features/modules/module-list";
import { Filters, Header } from "@/features/modules/module-toolbar";
import { useCompany } from "@/hooks/use-company";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";

type ApiModule = {
  id: string;
  name: string;
  category: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  thumbnailUrl: string;
  txConfirmed: boolean;
  shareToken: string;
  stats?: {
    enrolled: number;
    completed: number;
    available: number;
    avgScore: string;
  };
};

const skeletonKeys = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function toCategoryLabel(raw: string): ModuleCardData["category"] {
  const upper = raw.toUpperCase();
  if (upper === "AML") return "AML";
  if (upper === "KYC") return "KYC";
  if (upper === "DEFI") return "DeFi";
  return "Securities";
}

export function CompanyModules() {
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const { company, loading: companyLoading } = useCompany(slug, address);
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Reset between wallet/company switches so skeleton shows immediately.
    if (!address) {
      setModules([]);
      setHasLoaded(false);
      setLoading(false);
      return;
    }
    if (companyLoading) {
      setModules([]);
      setHasLoaded(false);
      setLoading(false);
      return;
    }
    if (!company) {
      setModules([]);
      setHasLoaded(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    if (!slug) {
      setModules([]);
      setHasLoaded(true);
      setLoading(false);
      return;
    }

    fetch(
      `/api/company/${encodeURIComponent(slug)}/modules?walletAddress=${encodeURIComponent(address)}`,
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error: string };
          throw new Error(body.error ?? "Failed to load modules");
        }
        return res.json() as Promise<{ modules: ApiModule[] }>;
      })
      .then((data) => {
        if (!cancelled) setModules(data.modules);
      })
      .catch(() => {
        if (!cancelled) setModules([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setHasLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, slug, company, companyLoading]);

  const cards = useMemo<ModuleCardData[]>(
    () =>
      modules.map((m) => {
        if (m.status === "DRAFT") {
          return {
            slug: m.id,
            title: m.name,
            category: toCategoryLabel(m.category),
            coverImageUrl: m.thumbnailUrl,
            mode: "edit",
          };
        }

        return {
          slug: m.id,
          title: m.name,
          category: toCategoryLabel(m.category),
          coverImageUrl: m.thumbnailUrl,
          mode: "stats",
          shareToken: m.shareToken,
          stats: {
            enrolled: m.stats?.enrolled ?? 0,
            completed: m.stats?.completed ?? 0,
            available: m.stats?.available ?? 0,
            avgScore: m.stats?.avgScore ?? "—",
          },
        };
      }),
    [modules],
  );

  const activeCount = modules.filter((m) => m.status === "ACTIVE").length;
  const showSkeleton =
    Boolean(address) && (companyLoading || loading || !hasLoaded);

  return (
    <>
      <Header total={loading ? 0 : activeCount} />
      <Filters />
      {showSkeleton ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {skeletonKeys.map((k) => (
            <div
              key={`skeleton-${k}`}
              className="flex flex-col overflow-hidden rounded-md border border-border bg-card"
            >
              <Skeleton className="h-[188px] w-full rounded-none" />
              <div className="flex flex-col gap-3.5 px-3 py-4">
                <Skeleton className="h-5 w-3/4" />
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20 justify-self-end" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20 justify-self-end" />
                </div>
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ModuleList modules={cards} />
      )}
    </>
  );
}
