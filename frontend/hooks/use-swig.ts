"use client";

import type { Address } from "@solana/kit";
import { fetchSwig, type Swig } from "@swig-wallet/kit";
import { useEffect, useState } from "react";
import { rpc } from "@/hooks/use-contract";

// ─── useSwigAccount ───────────────────────────────────────────────────────────

type UseSwigAccountReturn = {
  swig: Swig | null;
  loading: boolean;
  error: Error | null;
};

/** Fetches and decodes a Swig account from its PDA address. */
export function useSwigAccount(
  swigAddress: Address | null,
): UseSwigAccountReturn {
  const [swig, setSwig] = useState<Swig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!swigAddress) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const account = await fetchSwig(rpc as never, swigAddress);
        if (!cancelled) setSwig(account);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [swigAddress]);

  return { swig, loading, error };
}
