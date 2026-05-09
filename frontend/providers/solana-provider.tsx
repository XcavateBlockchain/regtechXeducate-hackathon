"use client";

import { AddressType } from "@phantom/browser-sdk";
import { PhantomProvider, type PhantomTheme } from "@phantom/react-sdk";
import type { PropsWithChildren } from "react";
import { appEnv } from "@/constants/app-env";

const customTheme: PhantomTheme = {
  background: "#ffffff",
  text: "#09090b",
  secondary: "#71717A",
  brand: "#624781",
  error: "#ef4444",
  success: "#22c55e",
  borderRadius: "10px",
  overlay: "rgba(9, 9, 11, 0.5)",
};

const APP_ID = appEnv.PHANTOM_APP_ID;
// const _RPC_ENDPOINT = appEnv.SOLANA_RPC_URL;
// const _WS_ENDPOINT = appEnv.SOLANA_WS_URL;

if (typeof window !== "undefined" && !APP_ID) {
  console.warn(
    "[SimpleKit] NEXT_PUBLIC_PHANTOM_APP_ID is not set. Get one at https://phantom.com/portal and add it to .env.local.",
  );
}

function stripLeadingWww(hostname: string): string {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

/** True when currentHost is a single DNS label left of base apex (tenant subdomain). */
function isTenantSubdomain(
  currentHostname: string,
  baseHostname: string,
): boolean {
  const cur = stripLeadingWww(currentHostname);
  const base = stripLeadingWww(baseHostname);
  return cur !== base && cur.endsWith(`.${base}`);
}

/**
 * Phantom Portal requires each OAuth redirect URL to be allowlisted. Tenant hosts
 * (e.g. slug.localhost, acme.example.com) must not use their own `/auth/callback`
 * unless each is added in the portal — use the canonical `NEXT_PUBLIC_APP_URL` origin instead.
 */
function getPhantomRedirectOrigin(configuredBase: string): string {
  if (typeof window === "undefined") {
    try {
      return configuredBase
        ? new URL(
            /^https?:\/\//.test(configuredBase)
              ? configuredBase
              : `https://${configuredBase}`,
          ).origin
        : "";
    } catch {
      return configuredBase || "";
    }
  }

  const currentOrigin = window.location.origin.replace(/\/$/, "");
  if (!configuredBase) return currentOrigin;

  try {
    const baseUrl = new URL(
      /^https?:\/\//.test(configuredBase)
        ? configuredBase
        : `https://${configuredBase}`,
    );
    const curUrl = new URL(currentOrigin);

    if (baseUrl.origin === curUrl.origin) {
      return baseUrl.origin;
    }

    if (isTenantSubdomain(curUrl.hostname, baseUrl.hostname)) {
      return baseUrl.origin;
    }
  } catch {
    return currentOrigin;
  }

  return currentOrigin;
}

function getPhantomRedirectUrl(): string {
  const configuredBase = (appEnv.APP_URL ?? "").trim().replace(/\/$/, "");
  const origin = getPhantomRedirectOrigin(configuredBase).replace(/\/$/, "");
  return origin ? `${origin}/auth/callback` : "";
}

export default function SolanaWalletProvider({ children }: PropsWithChildren) {
  const redirectUrl = getPhantomRedirectUrl();

  return (
    <PhantomProvider
      config={{
        providers: ["google", "injected"],
        appId: APP_ID ?? "",
        addressTypes: [AddressType.solana],
        authOptions: {
          redirectUrl,
        },
      }}
      theme={customTheme}
      appName="Regtech"
    >
      {children}
    </PhantomProvider>
  );
}
