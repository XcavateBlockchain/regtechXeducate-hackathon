import type { ISolanaChain } from "@phantom/chain-interfaces";
import type { WalletSession } from "@solana/client";
import { type Address, getAddressEncoder } from "@solana/kit";

const addressEncoder = getAddressEncoder();

/**
 * Adapts Phantom Browser SDK Solana chain to {@link WalletSession} so
 * `@solana/react-hooks` `useSendTransaction` can sign via `authority`.
 */
export function createPhantomWalletSession(
  chain: ISolanaChain,
  ownerAddress: Address,
): WalletSession {
  if (!chain.isConnected || !chain.publicKey) {
    throw new Error("Phantom Solana is not connected");
  }

  return {
    account: {
      address: ownerAddress,
      publicKey: Uint8Array.from(addressEncoder.encode(ownerAddress)),
      label: undefined,
    },
    connector: { id: "phantom", name: "Phantom" },
    disconnect: async () => {},
    signTransaction: async (transaction) => {
      const signed = await chain.signTransaction(transaction as never);
      return signed as never;
    },
  };
}
