"use client";

import { ConnectBox, usePhantom } from "@phantom/react-sdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { consumePhantomOauthResumePath } from "@/lib/phantom-oauth-return";

export default function PhantomAuthCallbackPage() {
  const { isConnected, isLoading } = usePhantom();
  const router = useRouter();

  useEffect(() => {
    // Once Phantom finishes processing the callback and the session is connected,
    // send the user back to where they likely came from.
    if (!isLoading && isConnected) {
      const nextPath = consumePhantomOauthResumePath();
      router.replace(nextPath ?? "/");
    }
  }, [isConnected, isLoading, router]);

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 py-10 md:py-16">
      <header className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Completing sign-in…
        </p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
          Connecting your wallet
        </h1>
        <p className="text-sm text-muted-foreground">
          Please wait while we finish authenticating with Phantom.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        <ConnectBox />
      </section>
    </main>
  );
}
