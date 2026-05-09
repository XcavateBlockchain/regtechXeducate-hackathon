"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileButton } from "@/features/wallet/profile-button";
import { WalletButton } from "@/features/wallet/wallet-button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

export default function CompanyNavHeader() {
  const pathname = usePathname();
  const { user } = useUser();
  const isActive = (href: string) => pathname === href;
  return (
    <header className="border-b sticky top-0 z-50 bg-background/50 backdrop-blur-[45px] px-4 md:px-6">
      <div className="flex items-center justify-between h-14 gap-4 md:h-16 md:gap-6">
        {/* Logo + Nav */}
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/">
            <Image
              src={"/app_logo.svg"}
              alt="Regtech"
              width={180}
              height={32}
              // className="w-[180px] h-[32px]"
              loading="eager"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {user && (
              <Link
                key={"dashboard"}
                href={
                  user.role === "OWNER"
                    ? `/${user.company?.slug}`
                    : "/dashboard"
                }
              >
                <span
                  data-active={isActive("/dashboard")}
                  className={cn(
                    "text-sm leading-normal font-normal text-foreground py-5 border-y-2 border-transparent hover:border-b-primary data-[active=true]:border-b-primary data-[active=true]:text-primary",
                  )}
                >
                  {"Dashboard"}
                </span>
              </Link>
            )}
          </nav>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1">
          <WalletButton />
          <ProfileButton />
        </div>
      </div>
    </header>
  );
}
