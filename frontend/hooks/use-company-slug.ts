"use client";

import { useParams, usePathname } from "next/navigation";
import { isReservedSlug } from "@/lib/validations/reserved-slugs";

export function useCompanySlug(): string | null {
  const params = useParams<{ slug?: string }>();
  const pathname = usePathname();

  const fromParams = typeof params?.slug === "string" ? params.slug : null;
  if (fromParams) return fromParams;

  // Best-effort fallback (e.g. for non-segmented routes during transitions).
  const legacy = pathname.match(/^\/company\/([^/]+)(?:\/|$)/);
  if (legacy?.[1]) return legacy[1];

  const first = pathname.split("/")[1] ?? null;
  if (!first || isReservedSlug(first)) return null;
  return first;
}
