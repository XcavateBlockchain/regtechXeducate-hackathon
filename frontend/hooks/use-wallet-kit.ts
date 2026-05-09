import {
  AddressType,
  useAccounts,
  useDisconnect,
  useModal,
  usePhantom,
} from "@phantom/react-sdk";
import * as React from "react";
import {
  clearPendingAuthIntent,
  storageKeys,
  useAuthContext,
} from "@/providers/auth-provider";
import { useWalletContext } from "@/providers/wallet-provider";

const MODAL_CLOSE_DURATION = 320;
// const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

export function useWalletKit() {
  const accounts = useAccounts();
  const phantomModal = useModal();
  const { disconnect } = useDisconnect();
  const { isConnected } = usePhantom();
  const { open: isOpen, setOpen } = useWalletContext();
  const { setOpen: setAuthOpen, setActivePage } = useAuthContext();

  const address = React.useMemo(() => {
    if (!accounts) return null;
    const solanaEntry = accounts.find(
      (entry) => entry.addressType === AddressType.solana,
    );
    return solanaEntry?.address ?? null;
  }, [accounts]);

  const formattedAddress = address
    ? `${address.slice(0, 6)}•••${address.slice(-4)}`
    : "";

  function open() {
    if (isConnected) {
      setOpen(true);
    } else {
      phantomModal.open();
      setAuthOpen(false);
      setActivePage(0);
    }
  }

  function close() {
    setOpen(false);
    phantomModal.close();
  }

  function toggleModal() {
    if (isConnected) {
      setOpen((prev) => !prev);
    } else {
      if (phantomModal.isOpened) phantomModal.close();
      else phantomModal.open();
    }
  }

  function handleDisconnect() {
    clearPendingAuthIntent();
    setAuthOpen(false);
    // Wait for the close animation before tearing down the session so the
    // modal doesn't visibly snap to "Connect Wallet" mid-fade.
    setTimeout(() => {
      void disconnect().catch(() => undefined);
      setActivePage(0);
      localStorage.removeItem(storageKeys.role);
      localStorage.removeItem(storageKeys.user);
      localStorage.removeItem(storageKeys.company);
      localStorage.removeItem(storageKeys.employee);
      localStorage.removeItem("WALLET_ADDRESS");
    }, MODAL_CLOSE_DURATION);
  }
  return {
    isConnected,
    address,
    isModalOpen: isOpen || phantomModal.isOpened,
    formattedAddress,
    open,
    close,
    toggleModal,
    MODAL_CLOSE_DURATION,
    handleDisconnect,
    // LAMPORTS_PER_SOL,
  };
}
