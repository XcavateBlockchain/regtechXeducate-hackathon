"use client";

import { Button } from "@/components/ui/button";
import { getInviteClaimAbsoluteUrl } from "@/lib/invite-public-url";

type InviteRow = {
  id: string;
  email: string;
  inviteeName: string | null;
  permission: string;
  token: string;
  expiresAt: string;
  claimedAt: string | null;
  claimedBy: string | null;
  createdAt: string;
};

function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

export function InviteList({ invites }: { invites: InviteRow[] }) {
  if (!invites.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        No pending invites.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Invites</h2>
      </div>
      <ul className="divide-y divide-border">
        {invites.map((i) => {
          const status = i.claimedAt
            ? "Claimed"
            : isExpired(i.expiresAt)
              ? "Expired"
              : "Pending";
          return (
            <li key={i.id} className="px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {i.inviteeName ? `${i.inviteeName} · ` : ""}
                    {i.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {i.permission} · {status}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const url = getInviteClaimAbsoluteUrl(i.token);
                      try {
                        await navigator.clipboard.writeText(url);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    Copy link
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
