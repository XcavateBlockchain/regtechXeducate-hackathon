import { useConnect, usePhantom, useSolana } from "@phantom/react-sdk";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { buildPhantomAuthMessage } from "@/lib/phantom-auth-message";
import { toBase58Signature } from "@/lib/phantom-signature";
import {
  clearPendingAuthIntent,
  clearStoredAuthIntent,
  storageKeys,
  useAuthContext,
} from "@/providers/auth-provider";

export function LoginForm() {
  const { setActivePage } = useAuthContext();
  return (
    <SigninUser
      onBack={() => {
        clearStoredAuthIntent();
        clearPendingAuthIntent();
        setActivePage(0);
      }}
    />
  );
}

function SigninUser(props: { onBack: () => void }) {
  const { setAccountLoading } = useAuthContext();
  const { connect, isConnecting } = useConnect();
  const { address, isConnected, open: openWalletModal } = useWalletKit();
  const { solana } = useSolana();
  const phantom = usePhantom();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      if (!isConnected || !address) {
        throw new Error("Please connect your wallet to sign in");
      }
      if (!solana?.isConnected) {
        throw new Error("Solana wallet is not connected");
      }

      const timestampIso = new Date().toISOString();
      const message = buildPhantomAuthMessage({
        purpose: "login",
        resourceId: "login",
        walletAddress: address,
        timestampIso,
      });
      const signed = await solana.signMessage(message);
      const signature = toBase58Signature(signed);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          timestampIso,
          message,
          signature,
        }),
      });
      const json = (await res.json()) as {
        userId?: string;
        role?: "OWNER" | "EMPLOYEE" | "USER";
        companyId?: string | null;
        companySlug?: string | null;
        walletAddress?: string;
        error?: string;
      };
      if (!res.ok || !json.userId || !json.role) {
        throw new Error(json.error ?? "Sign in failed");
      }

      localStorage.setItem(storageKeys.user, json.userId);
      localStorage.setItem(storageKeys.role, json.role);
      if (json.companyId) {
        localStorage.setItem(storageKeys.company, json.companyId);
      } else {
        localStorage.removeItem(storageKeys.company);
      }
      localStorage.removeItem(storageKeys.employee);
      clearPendingAuthIntent();
      clearStoredAuthIntent();

      // Stop any provider-driven account loading flow from re-opening the modal.
      setAccountLoading(false);

      const path =
        json.role === "OWNER"
          ? json.companySlug
            ? `/${json.companySlug}`
            : null
          : "/dashboard";

      if (json.role === "OWNER" && !path) {
        throw new Error(
          "No company handle on file for this owner account. Contact support.",
        );
      }

      // Full navigation avoids losing the transition when the auth Dialog unmounts
      // this component right after setOpen(false).
      window.location.assign(path ?? "/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-start gap-2 mb-4">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
          onClick={props.onBack}
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
          Back
        </button>

        <ModalHeader className="flex items-start flex-col gap-0 md:pb-0">
          <ModalTitle className="text-sm font-semibold">Sign In</ModalTitle>
          <ModalDescription className="text-center hidden">
            wallet
          </ModalDescription>
        </ModalHeader>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        <Button
          type="button"
          className="w-full"
          variant={isConnected ? "default" : "outline"}
          onClick={
            isConnected
              ? onSubmit
              : async () => {
                  setError(null);
                  try {
                    if (phantom.isLoading) return;
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem(
                        storageKeys.pendingAuthIntent,
                        "login",
                      );
                    }
                    await connect({ provider: "google" });
                  } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error("[Phantom connect google failed]", e);
                    openWalletModal();
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Failed to connect wallet",
                    );
                  }
                }
          }
          disabled={loading || isConnecting || phantom.isLoading}
        >
          {loading
            ? "Signing in…"
            : isConnected
              ? "Sign in with connected wallet"
              : isConnecting
                ? "Connecting…"
                : "Connect wallet (Google) to sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Don’t have an account? Use an invite link (employees) or a module link
          (users) to create one.
        </p>
      </div>
    </>
  );
}
