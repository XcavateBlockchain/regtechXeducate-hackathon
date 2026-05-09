import Image from "next/image";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-button";
import {
  KpiStats,
  ModuleDetails,
  ModuleHeader,
  ResultsTable,
} from "@/features/module";
import { AssignToEmployeesPanel } from "@/features/modules/assign-to-employees-panel";
import { prisma } from "@/lib/prisma";

function truncate(addr: string) {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default async function ModuleDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; moduleId: string }>;
}) {
  const { slug, moduleId } = await params;
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      name: true,
      status: true,
      description: true,
      thumbnailUrl: true,
      moduleType: true,
      files: { select: { id: true, fileName: true, fileUrl: true } },
      assessment: { select: { id: true } },
    },
  });

  if (!module) notFound();

  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

  const assessmentId = module.assessment?.id ?? null;
  const attempts = assessmentId
    ? await prisma.assessmentAttempt.findMany({
        where: { assessmentId, submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        take: 50,
        select: {
          submittedAt: true,
          passed: true,
          score: true,
          onChainScoreBps: true,
          user: { select: { id: true, name: true, walletAddress: true } },
          employee: {
            select: {
              user: { select: { id: true, name: true, walletAddress: true } },
            },
          },
        },
      })
    : [];

  const recipientIds = attempts
    .map((a) => a.user?.id ?? a.employee?.user.id ?? null)
    .filter((id): id is string => typeof id === "string");

  const credentials = recipientIds.length
    ? await prisma.credential.findMany({
        where: { moduleId, recipientId: { in: recipientIds } },
        orderBy: { issuedAt: "desc" },
        select: {
          recipientId: true,
          txSignature: true,
          credentialAsset: true,
          onChainAddress: true,
        },
      })
    : [];

  const credentialByRecipient = new Map<string, (typeof credentials)[number]>();
  for (const c of credentials) {
    if (!credentialByRecipient.has(c.recipientId))
      credentialByRecipient.set(c.recipientId, c);
  }

  const rows = attempts.map((a) => {
    const person = a.user ?? a.employee?.user ?? null;
    const recipientId = person?.id ?? null;
    const cred = recipientId
      ? (credentialByRecipient.get(recipientId) ?? null)
      : null;

    const scorePct =
      typeof a.score === "number"
        ? a.score
        : typeof a.onChainScoreBps === "number"
          ? Math.round(a.onChainScoreBps / 100)
          : null;
    const passed = Boolean(a.passed);
    const date = a.submittedAt
      ? new Date(a.submittedAt).toLocaleDateString()
      : "—";

    const certHref = cred?.credentialAsset
      ? `https://explorer.solana.com/address/${encodeURIComponent(cred.credentialAsset)}?cluster=${encodeURIComponent(cluster)}`
      : cred?.txSignature
        ? `https://explorer.solana.com/tx/${encodeURIComponent(cred.txSignature)}?cluster=${encodeURIComponent(cluster)}`
        : cred?.onChainAddress
          ? `https://explorer.solana.com/address/${encodeURIComponent(cred.onChainAddress)}?cluster=${encodeURIComponent(cluster)}`
          : null;

    const certLabel = cred?.credentialAsset
      ? truncate(cred.credentialAsset)
      : cred?.txSignature
        ? truncate(cred.txSignature)
        : "—";

    return {
      investor: person?.name ?? "—",
      wallet: person?.walletAddress ? truncate(person.walletAddress) : "—",
      module: module.name,
      score: scorePct != null ? `${scorePct}%` : "—",
      scoreTone: passed ? ("success" as const) : ("danger" as const),
      result: passed ? ("Passed" as const) : ("Failed" as const),
      date,
      certLabel,
      certHref,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-[1512px] flex-col gap-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <BackLink />
      </div>

      <ModuleHeader
        slug={slug}
        module={{
          id: module.id,
          title: module.name,
          status: module.status,
          description: module.description,
        }}
      />
      <section className="grid grid-cols-1 gap-4 md:grid-cols-[360px_1fr]">
        <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
          {module.thumbnailUrl ? (
            <div className="flex flex-col gap-2 p-2">
              <Image
                src={module.thumbnailUrl}
                alt={module.name}
                width={720}
                height={480}
                unoptimized
                className="h-auto w-full rounded-md object-cover"
              />
              <a
                href={module.thumbnailUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Open thumbnail
              </a>
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
              No thumbnail
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Module files
          </h2>
          {module.files.length ? (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {module.files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="truncate text-muted-foreground">
                    {f.fileName}
                  </span>
                  <a
                    href={f.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    View
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No files uploaded.
            </p>
          )}
        </div>
      </section>

      <AssignToEmployeesPanel moduleId={module.id} />
      <KpiStats
        moduleId={module.id}
        moduleName={module.name}
        fileUrl={module.files[0]?.fileUrl ?? null}
      />
      <ModuleDetails text={module.description} />
      <ResultsTable rows={rows} />
    </div>
  );
}
