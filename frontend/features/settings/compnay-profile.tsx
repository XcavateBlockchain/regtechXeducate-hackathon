"use client";

import { useCompany } from "@/hooks/use-company";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { CompanyEditForm } from "./company-edit-form";

export function CompanyProfile() {
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const { company, loading } = useCompany(slug, address);

  if (!address || loading) {
    return (
      <div className="bg-white border rounded-[10px] p-6">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="h-9 w-full rounded bg-muted" />
          <div className="h-9 w-full rounded bg-muted" />
          <div className="h-9 w-full rounded bg-muted" />
          <div className="h-9 w-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-[10px] p-6">
      <CompanyEditForm company={company} />
    </div>
  );
}
