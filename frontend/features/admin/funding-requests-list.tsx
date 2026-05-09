"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWalletKit } from "@/hooks/use-wallet-kit";

type FundingRequestRow = {
  id: string;
  companyId: string;
  requestedLamports: string;
  dailyCapLamports: string | null;
  reason: string | null;
  status: string;
  requestedByWallet: string;
  createdAt: string;
  txHash: string | null;
  rejectReason: string | null;
  company: { id: string; name: string; swigAddress: string | null };
};

const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

function lamportsToSolStr(lamports: string): string {
  const n = BigInt(lamports);
  const whole = n / LAMPORTS_PER_SOL;
  const frac = n % LAMPORTS_PER_SOL;
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

export function FundingRequestsList() {
  const { address } = useWalletKit();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<FundingRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>(
    {},
  );
  const [actingId, setActingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/funding-requests?walletAddress=${encodeURIComponent(address)}&status=PENDING`,
      );
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load requests");
      }
      const data = (await res.json()) as { requests: FundingRequestRow[] };
      setRequests(data.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function approve(id: string) {
    if (!address) return;
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/funding-requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Approve failed");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: string) {
    if (!address) return;
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/funding-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          rejectReason: rejectReasons[id]?.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Reject failed");
      }
      setRejectReasons((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActingId(null);
    }
  }

  if (!address) {
    return (
      <Card className="px-6 py-8">
        <p className="text-sm text-muted-foreground">
          Connect your Phantom wallet to review funding requests.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-6 px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Funding requests</h1>
          <p className="text-xs text-muted-foreground">
            Pending requests only. Approve sends SOL from the platform admin key
            to the company Partner PDA vault.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={refresh}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {requests.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {requests.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-border p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{r.company.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {r.company.id}
                  </p>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </div>
              <div className="grid gap-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Amount: </span>
                  {lamportsToSolStr(r.requestedLamports)} SOL
                </p>
                {r.dailyCapLamports ? (
                  <p>
                    <span className="text-muted-foreground">
                      Stated daily cap:{" "}
                    </span>
                    {lamportsToSolStr(r.dailyCapLamports)} SOL
                  </p>
                ) : null}
                {r.reason ? (
                  <p>
                    <span className="text-muted-foreground">Reason: </span>
                    {r.reason}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Requested by {r.requestedByWallet.slice(0, 8)}… ·{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`reject-${r.id}`} className="text-xs">
                    Reject reason (optional)
                  </Label>
                  <Textarea
                    id={`reject-${r.id}`}
                    rows={2}
                    className="text-sm min-h-[60px]"
                    placeholder="Optional note for the company"
                    value={rejectReasons[r.id] ?? ""}
                    onChange={(e) =>
                      setRejectReasons((prev) => ({
                        ...prev,
                        [r.id]: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={actingId !== null}
                    onClick={() => approve(r.id)}
                  >
                    {actingId === r.id ? "…" : "Approve"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={actingId !== null}
                    onClick={() => reject(r.id)}
                  >
                    {actingId === r.id ? "…" : "Reject"}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
