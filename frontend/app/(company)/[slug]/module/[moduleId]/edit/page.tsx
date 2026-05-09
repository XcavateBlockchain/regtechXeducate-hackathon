import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateModuleFrom } from "@/features/module-form";
import { prisma } from "@/lib/prisma";

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ slug: string; moduleId: string }>;
}) {
  const { slug, moduleId } = await params;
  const module = await prisma.module.findFirst({
    where: { id: moduleId, status: "DRAFT" },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      completionTime: true,
      language: true,
      passThreshold: true,
      maxRecipients: true,
      moduleType: true,
      thumbnailUrl: true,
      coolDownSeconds: true,
      expiresInSeconds: true,
      assessment: { select: { timeLimit: true } },
    },
  });

  if (!module) notFound();

  const defaultValues = {
    mode: "manual" as const,
    title: module.name,
    description: module.description,
    category: module.category as "securities" | "aml" | "kyc" | "defi" | "tax",
    completionTime: module.completionTime as "15" | "30" | "45" | "60" | "90",
    language: module.language as "en" | "es" | "fr" | "de" | "zh",
    passingScore: module.passThreshold / 100,
    recipients: module.maxRecipients,
    moduleType: (module.moduleType === "FCA_INVESTMENT"
      ? "fca_investment"
      : module.moduleType === "FCA_REGULATED"
        ? "fca_regulated"
        : "sec_framework") as
      | "fca_investment"
      | "fca_regulated"
      | "sec_framework",
    cooldownHours: Math.round(module.coolDownSeconds / 3600),
    quizTimeLimitMinutes: module.assessment?.timeLimit
      ? Math.round(module.assessment.timeLimit / 60)
      : undefined,
    credentialExpiryMonths: module.expiresInSeconds
      ? Math.round(module.expiresInSeconds / (30 * 86400))
      : undefined,
    ...(module.thumbnailUrl
      ? { existingThumbnailUrl: module.thumbnailUrl }
      : {}),
  };

  return (
    <main className="flex flex-col px-6 py-6 gap-6">
      <Link
        href={`/${slug}/module/${moduleId}`}
        className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" strokeWidth={1.75} />
        Back
      </Link>
      <CreateModuleFrom
        existingModuleId={moduleId}
        defaultValues={defaultValues}
      />
    </main>
  );
}
