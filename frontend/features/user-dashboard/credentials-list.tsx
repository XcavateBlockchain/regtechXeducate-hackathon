"use client";

type Credential = {
  id: string;
  moduleId: string | null;
  status: string;
  issuedAt: string;
  metadataUri: string;
  scoreBps: number | null;
};

type GroupedCredentials = {
  ACTIVE: Credential[];
  REVOKED: Credential[];
  EXPIRED: Credential[];
};

function fmtDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function fmtPctFromBps(bps: number | null) {
  if (typeof bps !== "number") return "—";
  return `${Math.round(bps / 100)}%`;
}

function CredentialSection({
  title,
  rows,
}: {
  title: string;
  rows: Credential[];
}) {
  if (!rows.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-border bg-card px-4 py-4"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  Credential {c.id.slice(0, 8)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.status} · Issued {fmtDate(c.issuedAt)} · Score{" "}
                  {fmtPctFromBps(c.scoreBps)}
                </p>
              </div>
              <a
                className="text-xs text-primary hover:underline"
                href={c.metadataUri}
                target="_blank"
                rel="noreferrer"
              >
                Open metadata
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CredentialsList({
  loading,
  credentials,
}: {
  loading: boolean;
  credentials: GroupedCredentials;
}) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading credentials…</p>
    );
  }

  const total =
    credentials.ACTIVE.length +
    credentials.REVOKED.length +
    credentials.EXPIRED.length;

  if (!total) {
    return (
      <p className="text-sm text-muted-foreground">
        No credentials yet. Complete a module to earn a credential.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <CredentialSection title="Active" rows={credentials.ACTIVE} />
      <CredentialSection title="Expired" rows={credentials.EXPIRED} />
      <CredentialSection title="Revoked" rows={credentials.REVOKED} />
    </div>
  );
}
