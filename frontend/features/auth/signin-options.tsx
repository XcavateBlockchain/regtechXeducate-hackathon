"use client";

import Image from "next/image";
import { ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import {
  setStoredAuthIntent,
  storageKeys,
  useAuthContext,
} from "@/providers/auth-provider";

export function SigninOptions() {
  const { open: openWalletModal } = useWalletKit();
  const { setActivePage, setIntent } = useAuthContext();
  return (
    <div className="flex flex-col gap-6 w-full">
      <ModalHeader className="text-center flex items-center flex-col gap-0 md:pb-0 md:pt-4">
        <div className="p-3 mb-4 rounded-full size-12 bg-primary/10 flex items-center justify-center">
          <Image
            src={"/main_logo.svg"}
            alt="Regtech"
            width={24}
            height={24}
            className="size-6 rounded-full"
          />
        </div>
        <ModalTitle className="text-base text-center font-bold">
          Welcome back
        </ModalTitle>
        <ModalDescription className="text-[#71717A] font-normal text-sm text-center">
          Choose how you'd like to continue
        </ModalDescription>
      </ModalHeader>
      <div className="w-full">
        <button
          type="button"
          className="bg-secondary hover:border-primary hover:bg-primary/10 flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm text-foreground transition-all duration-150 hover:-translate-y-px"
          data-testid="email-or-socials-button"
          onClick={() => {
            setIntent("login");
            if (typeof window !== "undefined") {
              sessionStorage.setItem(storageKeys.pendingAuthIntent, "login");
            }
            setStoredAuthIntent("general");
            setActivePage(1);
          }}
        >
          <div className="bg-primary border-border-secondary/60 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border">
            <svg
              className="text-primary-foreground"
              aria-hidden="true"
              width="16px"
              height="16px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C9.51472 2 7.5 4.01472 7.5 6.5C7.5 8.98528 9.51472 11 12 11C14.4853 11 16.5 8.98528 16.5 6.5C16.5 4.01472 14.4853 2 12 2Z"
                fill="currentColor"
              ></path>
              <path
                d="M12.001 12C7.70183 12 4.55378 14.8837 3.69691 18.6964C3.40713 19.9858 4.46429 21 5.59944 21H18.4026C19.5378 21 20.5949 19.9858 20.3051 18.6964C19.4483 14.8837 16.3002 12 12.001 12Z"
                fill="currentColor"
              ></path>
            </svg>
          </div>
          <div className="flex flex-col items-start text-sm leading-tight">
            <span className="font-medium">Continue with Google (wallet)</span>
          </div>
          <svg
            className="text-text-secondary ml-auto"
            aria-hidden="true"
            width="16px"
            height="16px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 4L16.2929 11.2929C16.6834 11.6834 16.6834 12.3166 16.2929 12.7071L9 20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        <span className="text-foreground font-medium text-xs">
          For <span className="font-bold">organization</span> only
        </span>
      </div>
      <button
        type="button"
        data-testid="show-all-wallets-button"
        className="bg-secondary hover:border-primary hover:text-white hover:bg-primary flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-150 hover:-translate-y-px"
        onClick={() => {
          setIntent("register-owner");
          if (typeof window !== "undefined") {
            sessionStorage.setItem(
              storageKeys.pendingAuthIntent,
              "register-owner",
            );
          }
          setStoredAuthIntent("owner");
          openWalletModal();
        }}
      >
        <div className="bg-white border-primary text-primary flex h-7 w-7 items-center justify-center rounded-lg border">
          <svg
            aria-hidden="true"
            width="16px"
            height="16px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M2 6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6ZM20 6H4V7H20V6ZM20 9H4V10H9C9.55228 10 10 10.4477 10 11V12H14V11C14 10.4477 14.4477 10 15 10H20V9Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
        <span className="text-sm font-medium">
          Continue with wallet (advanced)
        </span>
        <svg
          className="text-text-secondary ml-auto"
          aria-hidden="true"
          width="16px"
          height="16px"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 4L16.2929 11.2929C16.6834 11.6834 16.6834 12.3166 16.2929 12.7071L9 20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
        </svg>
      </button>
    </div>
  );
}
