"use client";

import { useEffect, useState } from "react";

export type CompanyData = {
  id: string;
  name: string;
  slug: string;
  swigAddress: string | null;
  swigWalletAddress?: string | null;
  txConfirmed: boolean;
  collectionAddress: string | null;
  partnerId: string;
  attestor: string | null;
  description: string;
  logoUrl: string | null;
  website: string | null;
  owner: {
    role: string;
    email: string;
    name: string;
  };
};

type UseCompanyReturn = {
  company: CompanyData | null;
  swigSolBalance: number;
  partnerVaultAddress: string | null;
  partnerVaultSolBalance: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useCompany(
  slug: string | null,
  walletAddress: string | null,
): UseCompanyReturn {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [swigSolBalance, setSwigSolBalance] = useState(0);
  const [partnerVaultAddress, setPartnerVaultAddress] = useState<string | null>(
    null,
  );
  const [partnerVaultSolBalance, setPartnerVaultSolBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void tick;
    if (!slug || !walletAddress) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(
      `/api/company/${encodeURIComponent(slug)}/me?walletAddress=${encodeURIComponent(walletAddress)}`,
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error: string };
          throw new Error(body.error ?? "Failed to load company");
        }
        return res.json() as Promise<{
          company: CompanyData;
          swigSolBalance: number;
          swigWalletAddress: string | null;
          partnerVaultAddress: string | null;
          partnerVaultSolBalance: number;
        }>;
      })
      .then(
        ({
          company,
          swigSolBalance,
          swigWalletAddress,
          partnerVaultAddress,
          partnerVaultSolBalance,
        }) => {
          if (!cancelled) {
            setCompany({ ...company, swigWalletAddress });
            setSwigSolBalance(swigSolBalance);
            setPartnerVaultAddress(partnerVaultAddress);
            setPartnerVaultSolBalance(partnerVaultSolBalance);
          }
        },
      )
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, walletAddress, tick]);

  return {
    company,
    swigSolBalance,
    partnerVaultAddress,
    partnerVaultSolBalance,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
