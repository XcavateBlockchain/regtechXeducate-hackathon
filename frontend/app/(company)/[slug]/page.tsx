import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CompanyDashboardHeader,
  CompanyStats,
  CredentialsIssued,
  ModulesPerformance,
  RecentActivities,
  TeamActivity,
} from "@/features/company";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Ensures this route stays dynamic and compatible with middleware rewrites.
  await params;

  return (
    <main className="flex flex-col px-6 py-6 gap-6">
      <CompanyDashboardHeader />
      <CompanyStats />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <RecentActivities />
        <TeamActivity />
      </div>
      <Tabs defaultValue="modules" className="w-full gap-6">
        <TabsList className={"bg-transparent gap-2.5"}>
          <TabsTrigger value="modules" className={"w-[173px]"}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="credentials" className={"w-[173px]"}>
            Credentials issued
          </TabsTrigger>
        </TabsList>
        <TabsContent value="modules" className="flex flex-col gap-6">
          <ModulesPerformance />
        </TabsContent>
        <TabsContent value="credentials" className="flex flex-col gap-6">
          <CredentialsIssued />
        </TabsContent>
      </Tabs>
    </main>
  );
}
