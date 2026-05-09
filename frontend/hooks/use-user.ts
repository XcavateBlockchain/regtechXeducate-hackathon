"use client";

import { useEffect, useState } from "react";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { storageKeys, useAuthContext } from "@/providers/auth-provider";
import { useWalletContext } from "@/providers/wallet-provider";

function clearStoredSession() {
  localStorage.removeItem(storageKeys.role);
  localStorage.removeItem(storageKeys.user);
  localStorage.removeItem(storageKeys.company);
  localStorage.removeItem(storageKeys.employee);
}

export type UserData = {
  userId: string;
  role: string;
  companyId: string | null;
  employmentId: string | null;
  walletAddress: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  company: { id: string; name: string; slug: string } | null;
  employment: {
    id: string;
    companyId: string;
    company: { id: string; name: string };
  } | null;
};

type UseUserReturn = {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  openAuthModal: () => void;
};

export function useUser(): UseUserReturn {
  const { address } = useWalletKit();
  const { accountLoading: authAccountLoading, setOpen: setAuthOpen } =
    useAuthContext();
  const { accountLoading: walletAccountLoading } = useWalletContext();
  const sessionLoading = authAccountLoading || walletAccountLoading;
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void tick;

    const storedUserId = localStorage.getItem(storageKeys.user);
    if (!storedUserId) {
      setUser(null);
      setError(null);
      setLoading(sessionLoading);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/auth/me?userId=${encodeURIComponent(storedUserId)}`)
      .then(async (res) => {
        if (res.status === 404) {
          return null;
        }
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Failed to load user");
        }
        return res.json() as Promise<UserData>;
      })
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setUser(null);
          clearStoredSession();
          return;
        }
        if (address && data.walletAddress !== address) {
          setUser(null);
          clearStoredSession();
          return;
        }
        setUser(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setUser(null);
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, sessionLoading, tick]);

  function openAuthModal() {
    setAuthOpen(true);
  }

  return {
    user,
    loading,
    error,
    openAuthModal,
    refetch: () => setTick((t) => t + 1),
  };
}
