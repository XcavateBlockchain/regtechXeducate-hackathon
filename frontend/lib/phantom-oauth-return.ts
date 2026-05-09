import { storageKeys } from "@/providers/auth-provider";

/** Only allow pathname-only redirects we control (invite claim, learner module join). */
function isAllowedPostPhantomPath(raw: string): boolean {
  if (!raw.startsWith("/") || raw.length > 512 || raw.includes("//"))
    return false;

  let pathnameOnly = raw;
  const q = raw.indexOf("?");
  if (q !== -1) pathnameOnly = raw.slice(0, q);

  if (pathnameOnly.startsWith("/invite/")) {
    const inviteToken = pathnameOnly.slice("/invite/".length);
    return inviteToken.length > 0 && !inviteToken.includes("/");
  }

  return /^\/m\/[^/]+\/join\/?$/.test(pathnameOnly);
}

/** Call before Phantom `connect()` so OAuth can return via `/auth/callback` onto this path. */
export function setPhantomOauthResumePath(
  pathnameAndOptionalQuery?: string,
): void {
  if (
    typeof window === "undefined" ||
    !pathnameAndOptionalQuery?.startsWith("/")
  )
    return;
  if (!isAllowedPostPhantomPath(pathnameAndOptionalQuery)) return;
  sessionStorage.setItem(
    storageKeys.postPhantomReturnPath,
    pathnameAndOptionalQuery,
  );
}

function stripUnsafeControlChars(value: string): string {
  return [...value]
    .filter((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      return cp >= 32 && cp !== 127;
    })
    .join("");
}

export function consumePhantomOauthResumePath(): string | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(storageKeys.postPhantomReturnPath);
  sessionStorage.removeItem(storageKeys.postPhantomReturnPath);
  if (!raw) return null;
  const clean = stripUnsafeControlChars(raw.trim());
  if (!isAllowedPostPhantomPath(clean)) return null;
  return clean;
}
