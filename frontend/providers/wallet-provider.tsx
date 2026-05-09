"use client";

import type { useWalletConnection } from "@solana/react-hooks";
import * as React from "react";
// import { Modal, ModalContent } from "@/components/modal";
import { PopMenu } from "@/components/pop-drawer";
import { WalletAccount } from "@/features/wallet/wallet-accout";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { getUserByWallet } from "@/lib/actions/user";

export type Connector = ReturnType<
  typeof useWalletConnection
>["connectors"][number];

const WalletContext = React.createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  accountLoading: boolean;
  setAccountLoading: React.Dispatch<React.SetStateAction<boolean>>;
  companyModal: boolean;
  setCompanyModal: React.Dispatch<React.SetStateAction<boolean>>;
  userModal: boolean;
  setUserModal: React.Dispatch<React.SetStateAction<boolean>>;
  /** Anchor for controlled desktop popover (no in-tree trigger). */
  walletMenuAnchorRef: React.RefObject<HTMLButtonElement | null>;
}>({
  open: false,
  setOpen: () => false,
  accountLoading: false,
  setAccountLoading: () => false,
  companyModal: false,
  setCompanyModal: () => false,
  userModal: false,
  setUserModal: () => false,
  walletMenuAnchorRef: { current: null },
});

const storageKeys = {
  role: "ROLE",
  user: "USER_ID",
  company: "COMPANY_ID",
  authIntent: "AUTH_INTENT",
};

export default function WalletProvider(props: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [accountLoading, setAccountLoading] = React.useState(false);
  const [companyModalOpen, setCompanyModalOpen] = React.useState(false);
  const [userModalOpen, setUserModalOpen] = React.useState(false);
  const walletMenuAnchorRef = React.useRef<HTMLButtonElement | null>(null);
  const { isConnected, address } = useWalletKit();

  React.useEffect(() => {
    if (isConnected && address) {
      const user = localStorage.getItem(storageKeys.user);
      if (!user) {
        const timeout = setTimeout(() => {
          setAccountLoading(true);
        }, 320);

        return () => clearTimeout(timeout);
      }
    }
  }, [isConnected, address]);

  React.useEffect(() => {
    if (accountLoading && address) {
      let ignore = false;
      const checkUser = async () => {
        const authIntent = localStorage.getItem(storageKeys.authIntent);
        const user = await getUserByWallet(address ?? "");
        if (ignore) return;
        if (!user && authIntent === "owner") {
          setCompanyModalOpen(true);
          setAccountLoading(false);
          return;
        }
        if (!user) {
          setAccountLoading(false);
          return;
        }
        localStorage.setItem("WALLET_ADDRESS", address);
        localStorage.setItem(storageKeys.role, user?.role ?? "");
        localStorage.setItem(storageKeys.user, user?.userId ?? "");
        localStorage.setItem(storageKeys.company, user?.companyId ?? "");
        setAccountLoading(false);
      };
      checkUser();
      return () => {
        ignore = true;
      };
    }
  }, [accountLoading, address]);

  return (
    <WalletContext.Provider
      value={{
        open,
        setOpen,
        accountLoading,
        setAccountLoading,
        companyModal: companyModalOpen,
        setCompanyModal: setCompanyModalOpen,
        userModal: userModalOpen,
        setUserModal: setUserModalOpen,
        walletMenuAnchorRef,
      }}
    >
      {props.children}
      <PopMenu open={open} onOpenChange={setOpen}>
        <WalletAccount />
      </PopMenu>
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = React.useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
