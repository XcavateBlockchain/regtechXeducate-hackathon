import { type ModuleCardData, ModuleItem } from "./module-item";

const sampleModules: ModuleCardData[] = [
  {
    slug: "sec-disclosure-requirements-edit",
    title: "SEC Disclosure Requirements",
    category: "Securities",
    mode: "edit",
  },
  {
    slug: "sec-disclosure-requirements",
    title: "SEC Disclosure Requirements",
    category: "Securities",
    mode: "stats",
    shareToken: "sample-share-token-sec",
    stats: {
      enrolled: 321,
      completed: 32,
      available: 91,
      avgScore: "92%",
    },
  },
  {
    slug: "anti-money-laundering-101",
    title: "Anti-Money Laundering 101",
    category: "AML",
    mode: "stats",
    shareToken: "sample-share-token-aml",
    stats: {
      enrolled: 247,
      completed: 198,
      available: 49,
      avgScore: "88%",
    },
  },
  {
    slug: "kyc-fundamentals",
    title: "KYC Fundamentals",
    category: "KYC",
    mode: "stats",
    shareToken: "sample-share-token-kyc",
    stats: {
      enrolled: 188,
      completed: 149,
      available: 39,
      avgScore: "79%",
    },
  },
  {
    slug: "defi-protocol-compliance",
    title: "DeFi Protocol Compliance",
    category: "DeFi",
    mode: "edit",
  },
  {
    slug: "tax-reporting-essentials",
    title: "Tax Reporting Essentials",
    category: "Securities",
    mode: "stats",
    shareToken: "sample-share-token-tax",
    stats: {
      enrolled: 412,
      completed: 387,
      available: 25,
      avgScore: "94%",
    },
  },
];

export function ModuleList({
  modules = sampleModules,
}: {
  modules?: ModuleCardData[];
}) {
  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-16 text-center">
        <p className="text-base font-medium text-ink-strong">
          No modules match your filters
        </p>
        <p className="text-sm text-muted-foreground">
          Try changing the search term or category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {modules.map((m) => (
        <ModuleItem key={m.slug} {...m} />
      ))}
    </div>
  );
}
