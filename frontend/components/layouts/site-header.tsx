"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navItems } from "@/constants/nvaigations";
import { ProfileButton } from "@/features/wallet/profile-button";
import { WalletButton } from "@/features/wallet/wallet-button";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { cn } from "@/lib/utils";
import Icon from "@/public/icons";
import Notifications from "./notification";

export default function CompanyNavHeader() {
  const pathname = usePathname();
  const { isConnected } = useWalletKit();
  const slug = useCompanySlug();

  const [menuOpen, setMenuOpen] = useState(false);

  const resolveHref = (href: string) => {
    if (!href.startsWith("/")) return href;
    if (!slug) return href;

    // Company navigation is path-based: `/:slug/*`.
    // `navItems` should use root-relative paths like `/modules`, `/team`, etc.
    return href === "/" ? `/${slug}` : `/${slug}${href}`;
  };

  const isActive = (href: string) => pathname === resolveHref(href);

  return (
    <header className="border-b sticky top-0 z-50 bg-background/50 backdrop-blur-[45px] px-4 md:px-6">
      <div className="flex items-center justify-between h-14 gap-4 md:h-16 md:gap-6">
        {/* Logo + Nav */}
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/">
            <span className="font-mono text-[28px] font-bold leading-6 tracking-[-0.143em] text-primary">
              {slug}
            </span>
          </Link>
          {isConnected && (
            <>
              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-6">
                {navItems.map((item) => (
                  <Link key={item.href} href={resolveHref(item.href)}>
                    <span
                      data-active={isActive(item.href)}
                      className={cn(
                        "text-sm leading-normal capitalize font-normal text-foreground py-5 border-y-2 border-transparent hover:border-b-primary data-[active=true]:border-b-primary data-[active=true]:text-primary",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </nav>
              {/* Mobile menu opener */}
              <button
                type="button"
                className="inline-flex md:hidden ml-2 text-ink-strong hover:text-foreground"
                aria-label="Open menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <Icon.menu className="size-6" strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-4 md:gap-4">
          {isConnected && <Notifications />}
          <div className="flex gap-1 items-center">
            <WalletButton />
            <ProfileButton />
          </div>
        </div>
      </div>
      {/* Mobile nav dropdown */}
      {isConnected && menuOpen && (
        <nav className="md:hidden animate-in fade-in slide-in-from-top-4 duration-200 absolute bg-background left-0 right-0 top-full border-b shadow-sm z-20 px-4 pt-4 pb-2">
          <ul className="flex flex-col gap-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={resolveHref(item.href)}
                  onClick={() => setMenuOpen(false)}
                  className="block w-full"
                >
                  <span
                    data-active={isActive(item.href)}
                    className={cn(
                      "text-base leading-normal font-normal text-foreground py-2 px-1 border-l-4 border-transparent hover:border-l-primary data-[active=true]:border-l-primary data-[active=true]:text-primary",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
