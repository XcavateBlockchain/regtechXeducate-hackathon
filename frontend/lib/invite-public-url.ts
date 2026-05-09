import { appEnv } from "@/constants/app-env";

/**
 * Employee invite links must use the canonical app origin (`NEXT_PUBLIC_APP_URL`)
 * whenever it is set, so Phantom Google OAuth completes on that origin too.
 * Tenant subdomains (e.g. `acme.localhost`) would otherwise break OAuth + sessionStorage return flow.
 */
export function getInviteClaimAbsoluteUrl(token: string): string {
  const path = `/invite/${encodeURIComponent(token)}`;
  const raw = (appEnv.APP_URL ?? "").trim().replace(/\/$/, "");
  if (raw) {
    try {
      const origin = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`)
        .origin;
      return `${origin}${path}`;
    } catch {
      // fall through
    }
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}
