import { TeamManager } from "@/features/team/team-manager";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;
  return <TeamManager />;
}
