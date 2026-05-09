import { CompanyModules } from "@/features/modules/company-modules";

export default async function ModulesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;
  return (
    <main className="flex flex-col px-6 py-6 gap-6">
      <CompanyModules />
    </main>
  );
}
