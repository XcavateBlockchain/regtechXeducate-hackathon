"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-6 px-4 py-12 md:py-16">
      <header className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">404</p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or the link is invalid.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button>
          <Link href="/">Go home</Link>
        </Button>
        <Button variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
