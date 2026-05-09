"use client";

// import { useDisconnect } from "@phantom/react-sdk";
import { Check, Copy } from "lucide-react";
import * as React from "react";
import {
  PopMenuBody,
  PopMenuContent,
  PopMenuDescription,
  PopMenuHeader,
  PopMenuTitle,
} from "@/components/pop-drawer";
// import { Button } from "@/components/ui/button";ß
import { useCompany } from "@/hooks/use-company";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useSolBalance } from "@/hooks/use-sol-balance";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { useWalletContext } from "@/providers/wallet-provider";

// import { formatAddress } from "@/lib/utils";

// const MODAL_CLOSE_DURATION = 320;

function truncate(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function WalletAccount() {
  const { address: solanaAddress } = useWalletKit();
  const { walletMenuAnchorRef } = useWalletContext();
  const slug = useCompanySlug();

  const balance = useSolBalance(solanaAddress);
  const { company, partnerVaultAddress, partnerVaultSolBalance } = useCompany(
    slug,
    solanaAddress,
  );
  // const swigAccountPda = company?.swigAddress ?? null;
  // const swigWalletPda = company?.swigAddress ?? null;
  // const swigWalletBalance = useSolBalance(swigWalletPda);

  return (
    <PopMenuContent
      showCloseButton={false}
      align="end"
      anchor={walletMenuAnchorRef}
      className="mt-2 p-4 rounded-[20px]"
    >
      {/* <div className="flex items-center justify-between w-full"></div> */}
      <PopMenuHeader className="flex items-start pb-2 sm:pb-0">
        <PopMenuTitle>Your Balance</PopMenuTitle>
        <PopMenuDescription className="sr-only">
          Account pop up for your connected Solana wallet. Connected - Wallet
          Balance
        </PopMenuDescription>
      </PopMenuHeader>
      <PopMenuBody className="md:min-h-fit">
        <div className="flex w-full flex-col items-start gap-8">
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col items-start justify-center gap-1 px-2">
              <p className="text-balance text-base font-bold text-muted-foreground">
                {`${balance ?? "0.00"} SOL`}
              </p>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm">
                  <div>{truncate(solanaAddress ?? "")}</div>
                </h1>
                <CopyAnyAddressButton address={solanaAddress ?? ""} />
              </div>
            </div>

            {company && (
              <div className="flex flex-col items-start justify-center gap-1 px-2">
                <p className="text-balance text-base font-bold text-muted-foreground">
                  {`${partnerVaultSolBalance ?? "0.00"} SOL`}
                </p>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm">
                    <div>{truncate(partnerVaultAddress ?? "")}</div>
                  </h1>{" "}
                  Swig Vault
                  <CopyAnyAddressButton address={partnerVaultAddress ?? ""} />
                </div>
              </div>
            )}
          </div>
        </div>
      </PopMenuBody>
    </PopMenuContent>
  );
}

// function CopyAddressButton() {
//   const { address: solanaAddress } = useWalletKit();
//   const [copied, setCopied] = React.useState(false);

//   React.useEffect(() => {
//     const timeout = setTimeout(() => {
//       if (copied) setCopied(false);
//     }, 1000);
//     return () => clearTimeout(timeout);
//   }, [copied]);

//   async function handleCopy() {
//     if (!solanaAddress) return;
//     setCopied(true);
//     await navigator.clipboard.writeText(solanaAddress);
//   }

//   return (
//     <button
//       type="button"
//       className="text-muted-foreground"
//       onClick={handleCopy}
//     >
//       {copied ? (
//         <Check className="size-4" strokeWidth={4} />
//       ) : (
//         <Copy className="size-4" strokeWidth={4} />
//       )}
//     </button>
//   );
// }

function CopyAnyAddressButton(props: { address: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (copied) setCopied(false);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    setCopied(true);
    await navigator.clipboard.writeText(props.address);
  }

  return (
    <button
      type="button"
      className="text-muted-foreground"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="size-4" strokeWidth={4} />
      ) : (
        <Copy className="size-4" strokeWidth={4} />
      )}
    </button>
  );
}
