import { type Address, address, createSolanaRpc } from "@solana/kit";
import { useEffect, useState } from "react";
import { appEnv } from "@/constants/app-env";

const { SOLANA_RPC_URL: RPC_URL } = appEnv;

const rpc = createSolanaRpc(RPC_URL);

export const LAMPORTS_PER_SOL = 1_000_000_000;

export function useSolBalance(addressString: string | null): number | null {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!addressString) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    let solAddress: Address;
    try {
      solAddress = address(addressString);
    } catch {
      setBalance(null);
      return;
    }

    void rpc
      .getBalance(solAddress)
      .send()
      .then((res) => {
        if (cancelled) return;
        // res.value is lamports as bigint. Number() is fine for UI display
        // (one billion SOL still fits in Number.MAX_SAFE_INTEGER) — never use
        // this conversion for transfer math.
        setBalance(Number(res.value) / LAMPORTS_PER_SOL);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });

    return () => {
      cancelled = true;
    };
  }, [addressString]);

  return balance;
}
