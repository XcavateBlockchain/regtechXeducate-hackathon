"use client";

import { useConnect, usePhantom, useSolana } from "@phantom/react-sdk";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field-input";
import Form, { useZodForm } from "@/components/ui/form";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { buildPhantomAuthMessage } from "@/lib/phantom-auth-message";
import { setPhantomOauthResumePath } from "@/lib/phantom-oauth-return";
import { toBase58Signature } from "@/lib/phantom-signature";
import { storageKeys } from "@/providers/auth-provider";

type InvitePreview = {
  companyName: string;
  email: string;
  inviteeName: string | null;
  permission: string;
  expired: boolean;
  claimed: boolean;
};

export default function InviteClaimPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const { connect, isConnecting } = useConnect();
  const { address, isConnected, open: openWalletModal } = useWalletKit();
  const { solana } = useSolana();
  const phantom = usePhantom();

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefilledName = invite?.inviteeName?.trim() ?? "";

  const schema = useMemo(
    () =>
      z.object({ name: z.string().max(200) }).superRefine((val, ctx) => {
        const hasInvitee = !!invite?.inviteeName?.trim();
        if (!hasInvitee && !val.name.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "Name is required",
            path: ["name"],
          });
        }
      }),
    [invite?.inviteeName],
  );

  const form = useZodForm({
    schema,
    defaultValues: { name: "" },
  });

  useEffect(() => {
    let cancelled = false;
    setLoadingInvite(true);
    setError(null);
    fetch(`/api/invite/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = (await res.json()) as {
          invite?: InvitePreview;
          error?: string;
        };
        if (!res.ok || !json.invite) {
          throw new Error(json.error ?? "Invite not found");
        }
        return json.invite;
      })
      .then((i) => {
        if (!cancelled) setInvite(i);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load invite");
      })
      .finally(() => {
        if (!cancelled) setLoadingInvite(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const n = invite?.inviteeName?.trim() ?? "";
    if (n) form.setValue("name", n);
  }, [invite, form]);

  async function onSubmit(values: { name?: string }) {
    setSubmitting(true);
    setError(null);
    try {
      if (!isConnected || !address) {
        throw new Error("Please connect your wallet to continue");
      }
      if (!solana?.isConnected) {
        throw new Error("Solana wallet is not connected");
      }

      const displayName = (
        invite?.inviteeName?.trim() ||
        values.name?.trim() ||
        ""
      ).trim();
      if (!displayName) {
        throw new Error("Name is required");
      }

      const timestampIso = new Date().toISOString();
      const message = buildPhantomAuthMessage({
        purpose: "invite-claim",
        resourceId: token,
        walletAddress: address,
        timestampIso,
      });

      const signed = await solana.signMessage(message);
      const signature = toBase58Signature(signed);

      const body: Record<string, string> = {
        walletAddress: address,
        timestampIso,
        message,
        signature,
      };
      if (!invite?.inviteeName?.trim()) {
        body.name = displayName;
      }

      const res = await fetch(
        `/api/invite/${encodeURIComponent(token)}/claim`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = (await res.json()) as {
        userId?: string;
        companyId?: string;
        role?: string;
        error?: string;
      };
      if (
        !res.ok ||
        !json.userId ||
        !json.companyId ||
        json.role !== "EMPLOYEE"
      ) {
        throw new Error(json.error ?? "Claim failed");
      }

      localStorage.setItem(storageKeys.role, "EMPLOYEE");
      localStorage.setItem(storageKeys.user, json.userId);
      localStorage.setItem(storageKeys.company, json.companyId);
      localStorage.removeItem(storageKeys.employee);

      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const blocked =
    loadingInvite ||
    !invite ||
    invite.expired ||
    invite.claimed ||
    !isConnected ||
    !address ||
    submitting;

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 py-10 md:py-16">
      <header className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Accept employee invitation
        </p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
          {loadingInvite ? "Loading…" : invite ? invite.companyName : "Invite"}
        </h1>
        {invite ? (
          <p className="text-sm text-muted-foreground">
            Invited as <span className="font-medium">{invite.permission}</span>{" "}
            for <span className="font-medium">{invite.email}</span>
            {prefilledName ? (
              <>
                . Your name on file:{" "}
                <span className="font-medium text-foreground">
                  {prefilledName}
                </span>
                .
              </>
            ) : null}
          </p>
        ) : null}
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {invite?.expired ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          This invite has expired. Ask your owner to resend an invitation.
        </div>
      ) : null}
      {invite?.claimed ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          This invite has already been claimed.
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        {!isConnected ? (
          <div className="mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                setError(null);
                try {
                  if (phantom.isLoading) return;
                  setPhantomOauthResumePath(
                    `/invite/${encodeURIComponent(token)}`,
                  );
                  await connect({ provider: "google" });
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error("[Phantom connect google failed]", e);
                  openWalletModal();
                  setError(
                    e instanceof Error ? e.message : "Failed to connect wallet",
                  );
                }
              }}
              disabled={
                loadingInvite ||
                !invite ||
                invite.expired ||
                invite.claimed ||
                isConnecting ||
                phantom.isLoading
              }
            >
              {isConnecting
                ? "Connecting…"
                : "Connect wallet (Google) to continue"}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Open this link using the URL your employer shared (canonical app
              host). Uses one Google sign-in, then brings you back here.
            </p>
          </div>
        ) : null}
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-3">
            <FieldInput label="Email" value={invite?.email ?? ""} disabled />
            <FieldInput
              {...form.register("name")}
              label={
                prefilledName
                  ? "Full name (from your invite)"
                  : "Full name (you enter)"
              }
              placeholder="Your name"
              error={form.formState.errors.name}
              autoComplete="name"
              required={!prefilledName}
              disabled={blocked || !!prefilledName}
            />
            <FieldInput
              label="Wallet address"
              value={address ?? ""}
              placeholder="Connect wallet to generate an address"
              disabled
            />
          </div>
          <Button type="submit" className="mt-4 w-full" disabled={blocked}>
            {submitting ? "Claiming…" : "Claim invite"}
          </Button>
        </Form>
      </section>
    </main>
  );
}
