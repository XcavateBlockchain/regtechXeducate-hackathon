import { type Address, getAddressEncoder, isAddress } from "@solana/kit";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { buildPhantomAuthMessage } from "@/lib/phantom-auth-message";

const addressEncoder = getAddressEncoder();

export type PhantomAuthPayload = {
  message: string;
  signature: string; // base58
};

export type VerifiedPhantomAuth = {
  walletAddress: Address;
  timestampIso: string;
};

const MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes

export function verifyPhantomAuthPayload(input: {
  purpose: "login" | "invite-claim" | "module-join";
  resourceId: string;
  walletAddress: string;
  timestampIso: string;
  payload: PhantomAuthPayload;
}): VerifiedPhantomAuth {
  if (!isAddress(input.walletAddress)) {
    throw new Error("Invalid wallet address");
  }

  // Replay mitigation (bounded by clock skew). For stronger replay defense,
  // store one-time nonces server-side; this keeps the change minimal.
  const ts = Date.parse(input.timestampIso);
  if (!Number.isFinite(ts)) throw new Error("Invalid timestamp");
  const now = Date.now();
  if (ts > now + 15_000) throw new Error("Timestamp is in the future");
  if (now - ts > MAX_SKEW_MS) throw new Error("Timestamp expired");

  const expectedMessage = buildPhantomAuthMessage({
    purpose: input.purpose,
    resourceId: input.resourceId,
    walletAddress: input.walletAddress,
    timestampIso: input.timestampIso,
  });
  if (input.payload.message !== expectedMessage) {
    throw new Error("Message mismatch");
  }

  const messageBytes = new TextEncoder().encode(input.payload.message);
  const signatureBytes = bs58.decode(input.payload.signature);
  const publicKeyBytes = Uint8Array.from(
    addressEncoder.encode(input.walletAddress as Address),
  );

  const ok = nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    publicKeyBytes,
  );
  if (!ok) throw new Error("Invalid signature");

  return {
    walletAddress: input.walletAddress as Address,
    timestampIso: input.timestampIso,
  };
}
