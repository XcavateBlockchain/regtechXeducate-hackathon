"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUser } from "@/hooks/use-user";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { isReservedSlug } from "@/lib/validations/reserved-slugs";
import { setStoredAuthIntent, storageKeys } from "@/providers/auth-provider";

export function ProfileButton() {
  const pathname = usePathname();
  const { user, loading, openAuthModal } = useUser();
  const { handleDisconnect, open: openWalletModal } = useWalletKit();
  const [open, setOpen] = useState(false);
  if (!loading && !user) {
    const onSignIn = () => {
      const firstSegment = pathname.split("/")[1] ?? "";
      const isCompanyContext =
        firstSegment !== "" && !isReservedSlug(firstSegment);

      if (isCompanyContext) {
        setStoredAuthIntent("owner");
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            storageKeys.pendingAuthIntent,
            "register-owner",
          );
        }
        openWalletModal();
        return;
      }

      openAuthModal();
    };

    return <Button onClick={onSignIn}>Sign in</Button>;
  }

  const orgName = user?.name;
  const roleLabel =
    user?.role === "OWNER"
      ? "Owner"
      : user?.role === "EMPLOYEE"
        ? "Employee"
        : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <div className="flex items-center gap-1">
          <Avatar className="size-9">
            <AvatarImage
              src={`https://avatar.vercel.sh/${user?.userId}?size=150`}
            />
            <AvatarFallback>RT</AvatarFallback>
          </Avatar>

          <div className="flex items-start justify-center flex-col">
            <p className="text-sm font-medium capitalize">{orgName}</p>
            <p className="text-xs text-muted-foreground capitalize -mt-0.5">
              {roleLabel ? roleLabel : null}
            </p>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className={"p-4 mt-2 "}>
        <div className="h-10 px-3 items-start flex font-medium text-base">
          {user?.email}
        </div>
        <button
          type="button"
          data-testid="topbar-sign-out"
          className="text-red-400 hover:bg-red-500/10 hover:text-red-300 flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors"
          onClick={() => {
            setOpen(false);
            handleDisconnect();
          }}
        >
          <svg
            className="size-5"
            aria-hidden="true"
            width="24px"
            height="24px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.25 20H5C4.44772 20 4 19.5523 4 19L4 5C4 4.44772 4.44772 4 5 4L11.25 4M20 12L8.75 12M20 12L15.5 16.5M20 12L15.5 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
          </svg>
          <span>Log out</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
