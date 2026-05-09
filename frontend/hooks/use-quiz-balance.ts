"use client";

import { useCallback, useEffect, useState } from "react";

export type QuizBalance = {
  purchased: number;
  consumed: number;
  refunded: number;
  remaining: number;
};

type QuizBalanceState = {
  balance: QuizBalance | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useQuizBalance(
  companyId: string | null | undefined,
  walletAddress: string | null | undefined,
): QuizBalanceState {
  const [balance, setBalance] = useState<QuizBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!companyId || !walletAddress) {
      setBalance(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/company/quiz-balance?companyId=${encodeURIComponent(
          companyId,
        )}&walletAddress=${encodeURIComponent(walletAddress)}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Failed to load quiz balance");
      }
      const data = (await res.json()) as QuizBalance;
      setBalance(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quiz balance");
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, walletAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { balance, loading, error, refresh };
}
