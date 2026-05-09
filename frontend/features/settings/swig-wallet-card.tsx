"use client";

import { ExternalLink, Wallet, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { appEnv } from "@/constants/app-env";

const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

type FundingRequestRow = {
  id: string;
  status: string;
  requestedLamports: string;
  dailyCapLamports: string | null;
  reason: string | null;
  createdAt: string;
  txHash: string | null;
  rejectReason: string | null;
};

type SwigWalletCardProps = {
  companyId: string;
  walletAddress: string;
  swigWalletAddress: string;
  solBalance: number;
  partnerVaultAddress: string | null;
  partnerVaultSolBalance: number;
  onAllocated?: () => void;
  onFunded?: () => void;
};

function truncate(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function lamportsToSolStr(lamports: string): string {
  const n = BigInt(lamports);
  const whole = n / LAMPORTS_PER_SOL;
  const frac = n % LAMPORTS_PER_SOL;
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

function inferClusterFromRpcUrl(rpcUrl: string) {
  const u = rpcUrl.toLowerCase();
  if (u.includes("devnet")) return "devnet";
  if (u.includes("testnet")) return "testnet";
  return "mainnet";
}

export function SwigWalletCard({
  companyId,
  walletAddress,
  swigWalletAddress,
  solBalance,
  partnerVaultAddress,
  partnerVaultSolBalance,
  onAllocated,
  onFunded,
}: SwigWalletCardProps) {
  const [allocating, setAllocating] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundCount, setRefundCount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [quizBalance, setQuizBalance] = useState<{
    purchased: number;
    consumed: number;
    refunded: number;
    remaining: number;
  } | null>(null);
  const [quizBalanceLoading, setQuizBalanceLoading] = useState(false);

  const [requestAmount, setRequestAmount] = useState("");
  const [dailyCapSol, setDailyCapSol] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [fundingRequests, setFundingRequests] = useState<FundingRequestRow[]>(
    [],
  );
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const cluster = useMemo(
    () => inferClusterFromRpcUrl(appEnv.SOLANA_RPC_URL ?? ""),
    [],
  );

  const refreshQuizBalance = useCallback(async () => {
    setQuizBalanceLoading(true);
    try {
      const res = await fetch(
        `/api/company/quiz-balance?companyId=${encodeURIComponent(
          companyId,
        )}&walletAddress=${encodeURIComponent(walletAddress)}`,
      );
      if (!res.ok) {
        setQuizBalance(null);
        return;
      }
      const data = (await res.json()) as {
        purchased: number;
        consumed: number;
        refunded: number;
        remaining: number;
      };
      setQuizBalance(data);
    } finally {
      setQuizBalanceLoading(false);
    }
  }, [companyId, walletAddress]);

  const refreshFundingRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const res = await fetch(
        `/api/company/fund-swig/requests?companyId=${encodeURIComponent(companyId)}&walletAddress=${encodeURIComponent(walletAddress)}`,
      );
      if (!res.ok) {
        setFundingRequests([]);
        return;
      }
      const data = (await res.json()) as { requests: FundingRequestRow[] };
      setFundingRequests(data.requests);
    } finally {
      setRequestsLoading(false);
    }
  }, [companyId, walletAddress]);

  useEffect(() => {
    refreshQuizBalance();
  }, [refreshQuizBalance]);

  useEffect(() => {
    refreshFundingRequests();
  }, [refreshFundingRequests]);

  async function handleAllocate() {
    setAllocating(true);
    setError(null);
    try {
      const res = await fetch("/api/company/allocate-quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, walletAddress, count: 100 }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error ?? "Failed");
      }
      await refreshQuizBalance();
      onAllocated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAllocating(false);
    }
  }

  async function handleRefund() {
    setError(null);
    const count = Number(refundCount);
    if (!Number.isFinite(count) || count <= 0) {
      setError("Enter a valid refund count");
      return;
    }
    setRefunding(true);
    try {
      const res = await fetch("/api/company/refund-quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, walletAddress, count }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error ?? "Failed");
      }
      setRefundCount("");
      await refreshQuizBalance();
      onAllocated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRefunding(false);
    }
  }

  async function handleSubmitFundingRequest() {
    setError(null);
    const sol = parseFloat(requestAmount);
    if (!sol || sol <= 0) {
      setError("Enter a valid SOL amount");
      return;
    }
    const lamports = BigInt(Math.round(sol * Number(LAMPORTS_PER_SOL)));
    let dailyCapLamports: string | undefined;
    if (dailyCapSol.trim()) {
      const capSol = parseFloat(dailyCapSol);
      if (!capSol || capSol <= 0) {
        setError("Daily cap must be a positive number when set");
        return;
      }
      dailyCapLamports = BigInt(
        Math.round(capSol * Number(LAMPORTS_PER_SOL)),
      ).toString();
    }

    setSubmittingRequest(true);
    try {
      const res = await fetch("/api/company/fund-swig/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          walletAddress,
          lamports: lamports.toString(),
          dailyCapLamports,
          reason: requestReason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Request failed");
      }
      setRequestAmount("");
      setDailyCapSol("");
      setRequestReason("");
      await refreshFundingRequests();
      onFunded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleCancelRequest(id: string) {
    setCancellingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/company/fund-swig/requests/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, walletAddress }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Cancel failed");
      }
      await refreshFundingRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <Card className="flex flex-col gap-5 px-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-primary" />
          <p className="text-sm font-medium">Company Vault (Swig)</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {truncate(swigWalletAddress)}
        </Badge>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-2xl font-semibold leading-6">
          {solBalance.toFixed(4)}
          <span className="ml-1 text-base font-normal text-muted-foreground">
            SOL
          </span>
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {swigWalletAddress}
        </p>
      </div>

      {partnerVaultAddress ? (
        <div className="rounded-md border border-border px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Partner vault (Partner PDA)
            </p>
            <Badge variant="outline" className="font-mono text-xs">
              {truncate(partnerVaultAddress)}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            {partnerVaultAddress}
          </p>
          <p className="mt-1 text-sm">
            {partnerVaultSolBalance.toFixed(4)}{" "}
            <span className="text-xs text-muted-foreground">SOL</span>
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-border p-4 flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium">Request vault funding</p>
          <p className="text-xs text-muted-foreground mt-1">
            Submit a request for review. When approved, SOL is sent from the
            platform to your company vault. No wallet signature required.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="fund-req-amount">Amount (SOL)</Label>
            <Input
              id="fund-req-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              disabled={submittingRequest}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fund-req-cap">
              Max daily recharge (SOL, optional)
            </Label>
            <Input
              id="fund-req-cap"
              type="number"
              min="0"
              step="0.01"
              placeholder="Optional — informational for reviewers"
              value={dailyCapSol}
              onChange={(e) => setDailyCapSol(e.target.value)}
              disabled={submittingRequest}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fund-req-reason">Note (optional)</Label>
          <Textarea
            id="fund-req-reason"
            rows={2}
            placeholder="Why you need this funding"
            value={requestReason}
            onChange={(e) => setRequestReason(e.target.value)}
            disabled={submittingRequest}
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="w-fit"
          onClick={handleSubmitFundingRequest}
          disabled={submittingRequest || !requestAmount}
        >
          {submittingRequest ? "Submitting…" : "Submit funding request"}
        </Button>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Recent requests {requestsLoading ? "(loading…)" : ""}
          </p>
          {fundingRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground">None yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {fundingRequests.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {lamportsToSolStr(r.requestedLamports)} SOL
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {r.status}
                    </Badge>
                  </div>
                  {r.dailyCapLamports ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Stated daily cap: {lamportsToSolStr(r.dailyCapLamports)}{" "}
                      SOL
                    </p>
                  ) : null}
                  {r.reason ? <p className="text-xs mt-1">{r.reason}</p> : null}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                  {r.status === "APPROVED" && r.txHash ? (
                    <a
                      href={`https://solscan.io/tx/${r.txHash}?cluster=${cluster}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
                    >
                      View transaction <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                  {r.status === "REJECTED" && r.rejectReason ? (
                    <p className="text-xs text-destructive mt-1">
                      {r.rejectReason}
                    </p>
                  ) : null}
                  {r.status === "PENDING" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 px-2 text-xs"
                      disabled={cancellingId !== null}
                      onClick={() => handleCancelRequest(r.id)}
                    >
                      {cancellingId === r.id ? "Cancelling…" : "Cancel request"}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
          <span>Allocated</span>
          <span className="font-medium text-foreground">
            {quizBalanceLoading ? "…" : (quizBalance?.purchased ?? "—")}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
          <span>Remaining</span>
          <span className="font-medium text-foreground">
            {quizBalanceLoading ? "…" : (quizBalance?.remaining ?? "—")}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
          <span>Consumed</span>
          <span className="font-medium text-foreground">
            {quizBalanceLoading ? "…" : (quizBalance?.consumed ?? "—")}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
          <span>Refunded</span>
          <span className="font-medium text-foreground">
            {quizBalanceLoading ? "…" : (quizBalance?.refunded ?? "—")}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleAllocate}
          disabled={allocating}
        >
          <Zap className="size-3.5" />
          {allocating ? "Allocating…" : "Allocate quizzes"}
        </Button>
        <Input
          type="number"
          min="0"
          step="1"
          placeholder="Refund #"
          value={refundCount}
          onChange={(e) => setRefundCount(e.target.value)}
          className="h-8 w-24 text-sm"
          disabled={refunding}
        />
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleRefund}
          disabled={refunding || !refundCount}
        >
          {refunding ? "Refunding…" : "Refund"}
        </Button>
      </div>
    </Card>
  );
}
