"use client";

import { usePhantom } from "@phantom/react-sdk";
import { useCompany } from "@/hooks/use-company";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useSolBalance } from "@/hooks/use-sol-balance";
import { useUser } from "@/hooks/use-user";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { useWalletContext } from "@/providers/wallet-provider";
import Icon from "@/public/icons";
import { SolIcon } from "@/public/icons/sol";

export function WalletButton() {
  const { user, loading } = useUser();
  const { address: solanaAddress, toggleModal } = useWalletKit();
  const { walletMenuAnchorRef } = useWalletContext();
  const { isConnected } = usePhantom();
  const slug = useCompanySlug();
  const balance = useSolBalance(solanaAddress);
  const { company, partnerVaultSolBalance } = useCompany(slug, solanaAddress);
  // const swigWalletAddress = company?.swigWalletAddress ?? null;
  // const swigWalletBalance = useSolBalance(swigWalletAddress);

  if (!isConnected || (!loading && !user)) return null;

  return (
    <button
      ref={walletMenuAnchorRef}
      type="button"
      className="flex items-center border border-[#181819] rounded-[10px] py-0.5 px-1.5 gap-1"
      onClick={toggleModal}
    >
      <span className="flex items-center gap-1">
        {`${company ? partnerVaultSolBalance : (balance ?? "0.00")}`}{" "}
        <SolIcon />
      </span>
      <Icon.arrowDown className="size-3" strokeWidth={2} />
    </button>
  );
}
