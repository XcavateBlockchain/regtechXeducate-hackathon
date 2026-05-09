"use client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-5" strokeWidth={1.75} />
      Back
    </button>
  );
}
