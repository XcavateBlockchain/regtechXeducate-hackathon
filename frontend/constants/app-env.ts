/**
 * Metaplex-style metadata `symbol` for credential NFT JSON (off-chain URI).
 * Short ticker shown in wallets; keep ≤10 chars for broad compatibility.
 */
export const CREDENTIAL_NFT_METADATA_SYMBOL = "RegtechX";

export const appEnv = {
  // Server admin keypair: regtech admin + swig delegate + attestor.
  XCAVATE_ADMIN_PRIVATE_KEY: process.env.XCAVATE_ADMIN_PRIVATE_KEY as string,
  /** Base58 mpl-core collection for credential NFTs (admin is update authority). */
  XCAVATE_GLOBAL_COLLECTION_ADDRESS: process.env
    .XCAVATE_GLOBAL_COLLECTION_ADDRESS as string,
  /** Base58 pubkey that may approve funding requests (single admin authority). */
  XCAVATE_ADMIN_PUBLIC_KEY: process.env.XCAVATE_ADMIN_PUBLIC_KEY as string,
  INITIAL_SWIG_FUND_LAMPORTS: process.env.INITIAL_SWIG_FUND_LAMPORTS as string,

  PHANTOM_APP_ID: process.env.NEXT_PUBLIC_PHANTOM_APP_ID as string,
  SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL as string,
  SOLANA_WS_URL: process.env.NEXT_PUBLIC_SOLANA_WS_URL as string,
  // USD price of 1 SOL (for UI estimates).
  SOL_USD: process.env.NEXT_PUBLIC_SOL_USD as string,

  XCAV_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION as string,
  AWS_S3_ACCESS_KEY: process.env.XCAV_AWS_S3_ACCESS_KEY as string,
  AWS_S3_SECRET_ACCESS_KEY: process.env.XCAV_AWS_S3_SECRET_ACCESS_KEY as string,
  AWS_S3_BUCKET_NAME: process.env.XCAV_AWS_S3_BUCKET_NAME as string,
  UPLOADED_IMAGE: process.env.NEXT_PUBLIC_UPLOADED_IMAGE as string,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL as string,
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string,
};

// Server-only: client bundles import appEnv but non-NEXT_PUBLIC vars are not available in the browser.
if (
  typeof window === "undefined" &&
  !appEnv.XCAVATE_GLOBAL_COLLECTION_ADDRESS?.trim()
) {
  throw new Error(
    "Missing XCAVATE_GLOBAL_COLLECTION_ADDRESS. Run scripts/init-global-collection.ts once, then set the printed address in .env.local.",
  );
}
