/**
 * One-time script: initializes the on-chain Config PDA for the regtech program.
 * Run ONCE per network (devnet / mainnet). Will fail with "already in use" if run again.
 *
 * Usage:
 *   bunx tsx scripts/init-program.ts
 *
 * Requires env vars in .env.local: XCAVATE_ADMIN_PRIVATE_KEY, NEXT_PUBLIC_SOLANA_RPC_URL
 */

import { config } from "dotenv";

config({ path: ".env.local" });

import {
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  pipe,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import {
  setTransactionMessageFeePayerSigner,
  signTransactionMessageWithSigners,
} from "@solana/signers";
import { getBase64EncodedWireTransaction } from "@solana/transactions";
import { getInitializeConfigInstructionAsync } from "../generated/reg_tech/instructions/initializeConfig";

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) throw new Error("Missing env var: NEXT_PUBLIC_SOLANA_RPC_URL");

  const rawKey = process.env.XCAVATE_ADMIN_PRIVATE_KEY;
  if (!rawKey) throw new Error("Missing env var: XCAVATE_ADMIN_PRIVATE_KEY");

  const keypairBytes = new Uint8Array(JSON.parse(rawKey) as number[]);
  const admin = await createKeyPairSignerFromBytes(keypairBytes);
  console.log("Admin address:", admin.address);

  const ix = await getInitializeConfigInstructionAsync({
    admin,
    defaultPassThresholdBps: 7000,
    defaultCooldownSeconds: 0,
  });

  const rpc = createSolanaRpc(rpcUrl);
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const signedTx = await pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(admin, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions([ix], m),
    (m) => signTransactionMessageWithSigners(m),
  );

  const wireTransaction = getBase64EncodedWireTransaction(signedTx);
  const signature = await rpc
    .sendTransaction(wireTransaction, {
      encoding: "base64",
      skipPreflight: false,
    })
    .send();

  console.log("Waiting for confirmation...");
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const { value } = await rpc
      .getSignatureStatuses(
        [signature as Parameters<typeof rpc.getSignatureStatuses>[0][0]],
        {
          searchTransactionHistory: false,
        },
      )
      .send();
    const status = value[0];
    if (
      status &&
      (status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized")
    ) {
      if (status.err)
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      console.log("✅ Config initialized. Tx:", String(signature));
      return;
    }
  }
  throw new Error("Transaction not confirmed within 30s");
}

main().catch((e) => {
  console.error("❌ Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
