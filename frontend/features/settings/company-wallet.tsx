"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCompany } from "@/hooks/use-company";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { cn } from "@/lib/utils";
import { RegtechTransactions } from "./regtech-transactions";
import { SwigWalletCard } from "./swig-wallet-card";

function WalletSectionSkeleton() {
  return (
    <div className="w-full grid grid-cols-1 gap-10">
      <div className="bg-white border rounded-[10px] px-6 py-4">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-44 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded bg-muted" />
            <div className="h-16 rounded bg-muted" />
            <div className="h-16 rounded bg-muted" />
            <div className="h-16 rounded bg-muted" />
          </div>
          <div className="h-9 w-40 rounded bg-muted" />
        </div>
      </div>

      <div className="bg-white border rounded-[10px] px-6 py-4">
        <div className="animate-pulse flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-11/12 rounded bg-muted" />
          <div className="h-4 w-10/12 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function CompanyWalletSection() {
  const { address, open: openWalletModal } = useWalletKit();
  const slug = useCompanySlug();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const {
    company,
    swigSolBalance,
    partnerVaultAddress,
    partnerVaultSolBalance,
    loading,
    error,
    refetch,
  } = useCompany(slug, address);

  async function confirmOnChain() {
    if (!slug || !address) return;
    setConfirmError(null);
    setConfirming(true);
    try {
      const res = await fetch(
        `/api/company/${encodeURIComponent(slug)}/confirm-onchain`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to confirm on-chain setup");
      }
      refetch();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setConfirming(false);
    }
  }

  if (!address || loading) return <WalletSectionSkeleton />;
  if (error) {
    return (
      <div className="w-full rounded-[10px] border bg-white px-6 py-4">
        <p className="text-sm font-medium text-foreground">
          Wallet access required
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect the company owner wallet to manage quizzes and funding
          requests.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={openWalletModal}>
            Connect wallet
          </Button>
          {slug ? (
            <Button variant="outline">
              <Link href={`/${slug}`}>Back to dashboard</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!company?.swigAddress || !company.swigWalletAddress) {
    return (
      <div className="w-full rounded-[10px] border bg-white px-6 py-4">
        <p className="text-sm font-medium text-foreground">
          Company wallet is still initializing
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          We’re still setting up your company’s on-chain wallet. Try again in a
          moment.
        </p>
      </div>
    );
  }

  if (!company.txConfirmed) {
    return (
      <Modal open disablePointerDismissal>
        <ModalContent showCloseButton={false}>
          <ModalHeader>
            <ModalTitle>Resume on-chain setup</ModalTitle>
            <ModalDescription>
              Your company registration hasn’t confirmed on-chain yet. Funding
              requests and quiz allocation will be available once confirmation
              completes.
            </ModalDescription>
          </ModalHeader>

          {confirmError ? (
            <div className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {confirmError}
            </div>
          ) : null}

          <ModalFooter>
            {slug ? (
              <Link
                href={`/${slug}`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Back to dashboard
              </Link>
            ) : (
              <Link
                href="/"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Back to dashboard
              </Link>
            )}
            <Button
              type="button"
              onClick={confirmOnChain}
              disabled={confirming}
            >
              {confirming ? "Confirming…" : "Resume on-chain setup"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 gap-10">
      <SwigWalletCard
        companyId={company.id}
        walletAddress={address}
        swigWalletAddress={company.swigWalletAddress}
        solBalance={swigSolBalance}
        partnerVaultAddress={partnerVaultAddress}
        partnerVaultSolBalance={partnerVaultSolBalance}
        onAllocated={refetch}
        onFunded={refetch}
      />
      <RegtechTransactions />
    </div>
  );
}
