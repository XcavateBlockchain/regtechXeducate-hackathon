/**
 * Server-side PDA derivation for accounts the generated client doesn't auto-resolve.
 * Seeds match the Anchor program (regtech) — verify against on-chain errors if changed.
 */

import {
  type Address,
  fixEncoderSize,
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  type ProgramDerivedAddress,
  type ReadonlyUint8Array,
} from "@solana/kit";
import { REGTECH_PROGRAM_ADDRESS } from "@/generated/reg_tech";

const enc = getAddressEncoder(); // base58 → 32-byte Uint8Array

function walletBytes(address: Address): ReadonlyUint8Array {
  return enc.encode(address);
}

function moduleHashBytes(moduleIdHash: string): Uint8Array {
  // moduleIdHash stored as 64-char hex → 32 bytes
  return new Uint8Array(Buffer.from(moduleIdHash, "hex"));
}

// seeds: ["module", partner_id_16, module_id_hash_32]
export async function findModulePda(
  partnerId: Uint8Array,
  moduleIdHash: string,
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: REGTECH_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([109, 111, 100, 117, 108, 101])), // "module"
      fixEncoderSize(getBytesEncoder(), 16).encode(partnerId),
      fixEncoderSize(getBytesEncoder(), 32).encode(
        moduleHashBytes(moduleIdHash),
      ),
    ],
  });
}

// seeds: ["enrollment", user_wallet_32, partner_id_16, module_id_hash_32]
export async function findEnrollmentPda(
  userWallet: Address,
  partnerId: Uint8Array,
  moduleIdHash: string,
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: REGTECH_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(
        new Uint8Array([101, 110, 114, 111, 108, 108, 109, 101, 110, 116]), // "enrollment"
      ),
      fixEncoderSize(getBytesEncoder(), 32).encode(walletBytes(userWallet)),
      fixEncoderSize(getBytesEncoder(), 16).encode(partnerId),
      fixEncoderSize(getBytesEncoder(), 32).encode(
        moduleHashBytes(moduleIdHash),
      ),
    ],
  });
}

// seeds: ["attempt", user_wallet_32, partner_id_16, module_id_hash_32]
export async function findAttemptPda(
  userWallet: Address,
  partnerId: Uint8Array,
  moduleIdHash: string,
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: REGTECH_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(
        new Uint8Array([97, 116, 116, 101, 109, 112, 116]), // "attempt"
      ),
      fixEncoderSize(getBytesEncoder(), 32).encode(walletBytes(userWallet)),
      fixEncoderSize(getBytesEncoder(), 16).encode(partnerId),
      fixEncoderSize(getBytesEncoder(), 32).encode(
        moduleHashBytes(moduleIdHash),
      ),
    ],
  });
}

// seeds: ["credential", user_wallet_32, partner_id_16, module_id_hash_32]
export async function findCredentialPda(
  userWallet: Address,
  partnerId: Uint8Array,
  moduleIdHash: string,
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: REGTECH_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(
        new Uint8Array([99, 114, 101, 100, 101, 110, 116, 105, 97, 108]), // "credential"
      ),
      fixEncoderSize(getBytesEncoder(), 32).encode(walletBytes(userWallet)),
      fixEncoderSize(getBytesEncoder(), 16).encode(partnerId),
      fixEncoderSize(getBytesEncoder(), 32).encode(
        moduleHashBytes(moduleIdHash),
      ),
    ],
  });
}
