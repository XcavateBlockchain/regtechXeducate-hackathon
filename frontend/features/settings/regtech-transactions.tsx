"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { appEnv } from "@/constants/app-env";
import { useWalletKit } from "@/hooks/use-wallet-kit";

type TxRow = {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
};

function truncate(sig: string) {
  return `${sig.slice(0, 6)}…${sig.slice(-6)}`;
}

function inferClusterFromRpcUrl(rpcUrl: string) {
  const u = rpcUrl.toLowerCase();
  if (u.includes("devnet")) return "devnet";
  if (u.includes("testnet")) return "testnet";
  return "mainnet";
}

function timeAgo(unixSeconds: number | null) {
  if (!unixSeconds) return "—";
  const then = unixSeconds * 1000;
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function RegtechTransactions() {
  const { address } = useWalletKit();
  const [loading, setLoading] = useState(false);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [debug, setDebug] = useState<{
    swigAddress: string;
    signaturesFound: number;
    transactionsFetched: number;
    regtechMatched: number;
  } | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/company/swig-transactions?walletAddress=${encodeURIComponent(address)}&limit=25`,
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          swigAddress: string;
          signaturesFound: number;
          transactionsFetched: number;
          regtechMatched: number;
          transactions: TxRow[];
        }>;
      })
      .then((data) => {
        if (!cancelled && data) {
          setTxs(data.transactions);
          setDebug({
            swigAddress: data.swigAddress,
            signaturesFound: data.signaturesFound,
            transactionsFetched: data.transactionsFetched,
            regtechMatched: data.regtechMatched,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTxs([]);
          setDebug(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  const cluster = useMemo(
    () => inferClusterFromRpcUrl(appEnv.SOLANA_RPC_URL),
    [],
  );

  return (
    <Card className="flex flex-col gap-4 px-6 py-4 rounded-[10px]">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold leading-6 text-[#545454]">
          Regtech transactions
        </h2>
        <span className="text-xs text-muted-foreground">
          {loading ? "Loading…" : `${txs.length} found`}
        </span>
      </div>

      {debug ? (
        <p className="text-xs text-muted-foreground">
          Swig {debug.swigAddress} · sigs {debug.signaturesFound} · fetched{" "}
          {debug.transactionsFetched} · regtech {debug.regtechMatched}
        </p>
      ) : null}

      {txs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {loading ? "Fetching transactions…" : "No regtech transactions yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3 text-sm">
          {txs.slice(0, 10).map((t) => {
            const href = `https://solscan.io/tx/${t.signature}?cluster=${cluster}`;
            return (
              <li
                key={t.signature}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {truncate(t.signature)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(t.blockTime)} · slot {t.slot}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      t.err
                        ? "text-xs text-status-danger"
                        : "text-xs text-status-success"
                    }
                  >
                    {t.err ? "Failed" : "Success"}
                  </span>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    View <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
