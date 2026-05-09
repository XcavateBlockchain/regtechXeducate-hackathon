import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CreateModuleFrom } from "@/features/module-form";

export default async function CreateModule({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="flex flex-col px-6 py-6 gap-6">
      <Link
        href={`/${slug}/modules`}
        className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" strokeWidth={1.75} />
        Back
      </Link>
      <CreateModuleFrom />
    </main>
  );
}
