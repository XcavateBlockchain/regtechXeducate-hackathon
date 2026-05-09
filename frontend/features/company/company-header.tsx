"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCompanySlug } from "@/hooks/use-company-slug";

export function CompanyDashboardHeader() {
  const slug = useCompanySlug();
  const createHref = slug ? `/${slug}/module/create` : "/module/create";
  const employeeHref = slug ? `/${slug}/team` : "/team";

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-base text-muted-foreground">
          Financial services joined March 2024
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <Button
          nativeButton={false}
          render={<Link href={employeeHref}>Add team</Link>}
          variant="outline"
          className="gap-2"
        >
          Add Employee
          <Plus className="size-3.5" strokeWidth={2} />
        </Button>

        <Button
          nativeButton={false}
          render={<Link href={createHref}>Create Module</Link>}
        >
          Create Module
        </Button>
      </div>
    </div>
  );
}
