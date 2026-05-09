"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";

type ApiCredential = {
  id: string;
  issuedAt: string;
  metadataUri: string;
  txSignature: string;
  credentialAsset: string | null;
  onChainAddress: string;
  scoreBps: number | null;
  module: { id: string; name: string } | null;
  recipient: { name: string; email: string; walletAddress: string };
};

function truncate(addr: string) {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function explorerBase() {
  return `https://explorer.solana.com`;
}

export function CredentialsIssued() {
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const [rows, setRows] = useState<ApiCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

  useEffect(() => {
    setWalletAddress(address ?? localStorage.getItem("WALLET_ADDRESS"));
  }, [address]);

  useEffect(() => {
    if (!slug || !walletAddress) return;
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/company/${encodeURIComponent(slug)}/credentials?walletAddress=${encodeURIComponent(walletAddress)}`,
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ credentials: ApiCredential[] }>;
      })
      .then((data) => {
        if (!cancelled && data) setRows(data.credentials ?? []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, walletAddress]);

  const display = useMemo(() => rows, [rows]);

  return (
    <Card className="px-6 pt-5 pb-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold leading-6 text-ink-strong">
          Credentials issued
        </h2>
        {loading ? (
          <span className="text-sm text-muted-foreground">Loading…</span>
        ) : (
          <span className="text-sm text-muted-foreground">
            {display.length} total
          </span>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-[rgba(149,149,131,0.08)] hover:bg-[rgba(149,149,131,0.08)]">
            <TableHead className="w-[22%]">Recipient</TableHead>
            <TableHead className="w-[20%]">Module</TableHead>
            <TableHead className="w-[10%]">Score</TableHead>
            <TableHead className="w-[16%]">NFT</TableHead>
            <TableHead className="w-[16%]">Tx</TableHead>
            <TableHead className="w-[16%]">Issued</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {display.length ? (
            display.map((c) => {
              const nftHref = c.credentialAsset
                ? `${explorerBase()}/address/${encodeURIComponent(c.credentialAsset)}?cluster=${encodeURIComponent(cluster)}`
                : null;
              const txHref = c.txSignature
                ? `${explorerBase()}/tx/${encodeURIComponent(c.txSignature)}?cluster=${encodeURIComponent(cluster)}`
                : null;
              const issued = new Date(c.issuedAt).toLocaleDateString();
              return (
                <TableRow key={c.id}>
                  <TableCell className="text-ink-strong">
                    <div className="flex flex-col">
                      <span className="font-medium">{c.recipient.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.recipient.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-ink-strong">
                    {c.module?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-ink-strong">
                    {typeof c.scoreBps === "number"
                      ? `${Math.round(c.scoreBps / 100)}%`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {nftHref ? (
                      <Link
                        href={nftHref}
                        target="_blank"
                        className="font-medium text-action-link transition-colors hover:underline"
                      >
                        {truncate(c.credentialAsset ?? "")}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {txHref ? (
                      <Link
                        href={txHref}
                        target="_blank"
                        className="font-medium text-action-link transition-colors hover:underline"
                      >
                        {truncate(c.txSignature)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-ink-subtle">{issued}</TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No credentials issued yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
