import { CompanyProfile, CompanyWalletSection } from "@/features/settings";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;
  return (
    <main className="flex flex-col px-6 py-6 gap-7">
      <div>
        <h1 className="font-bold text-2xl">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Company configuration and on-chain identity.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-5">
        <CompanyProfile />
        <CompanyWalletSection />
      </div>
    </main>
  );
}
