import { create, createCollectionV1 } from "@metaplex-foundation/mpl-core";
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  publicKey as umiPublicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  AccountRole,
  type Address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  type Instruction,
  type KeyPairSigner,
  pipe,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import {
  setTransactionMessageFeePayerSigner,
  signTransactionMessageWithSigners,
} from "@solana/signers";
import { getBase64EncodedWireTransaction } from "@solana/transactions";
import {
  Actions,
  createEd25519AuthorityInfo,
  fetchSwig,
  findSwigPda,
  getAddAuthorityInstructions,
  getCreateSwigInstruction,
  getSignInstructions,
  getSwigWalletAddress,
  type Swig,
} from "@swig-wallet/kit";
import { appEnv } from "@/constants/app-env";
import { REGTECH_PROGRAM_ADDRESS } from "@/generated/reg_tech";

const { SOLANA_RPC_URL: RPC_URL, XCAVATE_GLOBAL_COLLECTION_ADDRESS } = appEnv;
if (!RPC_URL) {
  throw new Error(
    "Missing NEXT_PUBLIC_SOLANA_RPC_URL (Solana RPC URL). Set it in .env.local to a working RPC endpoint.",
  );
}

// ─── Keypair loading ──────────────────────────────────────────────────────────

function loadKeypairBytes(envVar: string): Uint8Array {
  const raw = process.env[envVar];
  if (!raw) throw new Error(`Missing env var: ${envVar}`);
  if (raw.trimStart().startsWith("[")) {
    return new Uint8Array(JSON.parse(raw) as number[]);
  }
  throw new Error(`${envVar} must be a JSON array of 64 bytes`);
}

let _adminSigner: KeyPairSigner | null = null;

export async function getAdminSigner(): Promise<KeyPairSigner> {
  if (!_adminSigner)
    _adminSigner = await createKeyPairSignerFromBytes(
      loadKeypairBytes("XCAVATE_ADMIN_PRIVATE_KEY"),
    );
  return _adminSigner;
}

function buildSolTransferInstruction(
  from: Address,
  to: Address,
  lamports: bigint,
): Instruction {
  // SystemProgram::Transfer (2) with u64 lamports little-endian.
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true);
  view.setUint32(4, Number(lamports & 0xffffffffn), true);
  view.setUint32(8, Number(lamports >> 32n), true);
  return {
    programAddress: "11111111111111111111111111111111" as Address,
    accounts: [
      { address: from, role: AccountRole.WRITABLE_SIGNER },
      { address: to, role: AccountRole.WRITABLE },
    ],
    data,
  };
}

// ─── UUID → bytes ─────────────────────────────────────────────────────────────

export function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) throw new Error(`Invalid UUID: ${uuid}`);
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ─── Transaction helpers ──────────────────────────────────────────────────────

/** Polls getSignatureStatuses until the tx is confirmed or times out (30s). */
async function waitForConfirmation(
  rpc: ReturnType<typeof createSolanaRpc>,
  signature: string,
): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const { value } = await rpc
      .getSignatureStatuses(
        [signature as Parameters<typeof rpc.getSignatureStatuses>[0][0]],
        { searchTransactionHistory: false },
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
      return;
    }
  }
  throw new Error(`Transaction ${signature} not confirmed within 30s`);
}

async function withRetries<T>(
  fn: () => Promise<T>,
  opts: { label: string; attempts: number; delayMs: number },
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < opts.attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < opts.attempts - 1) {
        await new Promise((r) => setTimeout(r, opts.delayMs));
      }
    }
  }
  throw lastErr instanceof Error
    ? new Error(
        `${opts.label} failed after ${opts.attempts} attempts: ${lastErr.message}`,
      )
    : new Error(`${opts.label} failed after ${opts.attempts} attempts`);
}

/** Build, sign, send, and confirm a transaction. Returns the signature string. */
export async function sendServerTransaction(
  signer: KeyPairSigner,
  instructions: Instruction[],
): Promise<string> {
  const rpc = createSolanaRpc(RPC_URL);
  const { value: latestBlockhash } = await withRetries(
    async () => await rpc.getLatestBlockhash().send(),
    { label: "getLatestBlockhash", attempts: 3, delayMs: 750 },
  );

  const signedTx = await pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
    (m) => signTransactionMessageWithSigners(m),
  );

  const wireTransaction = getBase64EncodedWireTransaction(signedTx);
  const signature = await rpc
    .sendTransaction(wireTransaction, {
      encoding: "base64",
      skipPreflight: false,
    })
    .send();

  await waitForConfirmation(rpc, String(signature));
  return String(signature);
}

// ─── Swig delegate signing ────────────────────────────────────────────────────

/**
 * Finds the role ID in the Swig account whose Ed25519 authority matches
 * the XCAVATE_ADMIN pubkey.
 */
export async function findDelegateRoleId(swig: Swig): Promise<number> {
  const delegateAddr = (await getAdminSigner()).address;
  for (const role of swig.roles) {
    const auth = role.authority;
    // Ed25519Authority exposes addressString (base58)
    if (
      "addressString" in auth &&
      (auth as { addressString: string }).addressString === delegateAddr
    ) {
      return role.id;
    }
  }
  throw new Error(
    "Delegate role not found in Swig account. Ensure the company Swig has the server delegate authority set.",
  );
}

/**
 * Fetches the Swig account, wraps the instruction with the server delegate role,
 * signs with XCAVATE_ADMIN_PRIVATE_KEY, and broadcasts the transaction.
 */
export async function executeViaSwigDelegate(
  swigAddress: Address,
  instruction: Instruction,
): Promise<string> {
  // fetchSwig expects Rpc<GetAccountInfoApi> from swig's bundled @solana/kit v2.
  // Our createSolanaRpc returns a v6 Rpc — structurally compatible at runtime.
  const rpc = createSolanaRpc(RPC_URL) as never;
  const delegateSigner = await getAdminSigner();

  const swigAccount = await fetchSwig(rpc, swigAddress);
  if (process.env.NODE_ENV !== "production") {
    const swigWalletAddress = await getSwigWalletAddress(swigAccount);
    console.log("[swig] delegate execution", {
      swigAddress: String(swigAddress),
      swigVersion: swigAccount.accountVersion(),
      swigWalletAddress: String(swigWalletAddress),
    });
  }
  const roleId = await findDelegateRoleId(swigAccount);

  // getSignInstructions returns KitInstruction[] (swig v2 types) — same runtime shape as v6 Instruction
  const signIxs = (await getSignInstructions(swigAccount, roleId, [
    instruction as never,
  ])) as unknown as Instruction[];

  return sendServerTransaction(delegateSigner, signIxs);
}

export async function createSwigForCompany(
  ownerAddress: Address,
  initialFundLamports?: bigint,
): Promise<{ swigAddress: Address; swigId: string }> {
  const adminSigner = await getAdminSigner();
  const adminAddress = adminSigner.address as Address;
  const swigIdBytes = crypto.getRandomValues(new Uint8Array(32));
  const swigAddress = (await findSwigPda(swigIdBytes)) as Address;

  const createIx = (await getCreateSwigInstruction({
    payer: adminAddress,
    id: swigIdBytes,
    actions: Actions.set().all().get(),
    authorityInfo: createEd25519AuthorityInfo(adminAddress),
  })) as unknown as Instruction;

  await sendServerTransaction(adminSigner, [createIx]);

  // Add owner as restricted co-authority (programLimit → regtech program only)
  const rpc = createSolanaRpc(RPC_URL) as never;
  const swigAccount = await fetchSwig(rpc, swigAddress);
  const rootRole = swigAccount.roles[0];
  if (!rootRole) throw new Error("Swig has no roles after creation");

  const ownerIxs = (await getAddAuthorityInstructions(
    swigAccount,
    rootRole.id,
    createEd25519AuthorityInfo(ownerAddress),
    Actions.set().programLimit({ programId: REGTECH_PROGRAM_ADDRESS }).get(),
    { payer: adminAddress },
  )) as unknown as Instruction[];

  await sendServerTransaction(adminSigner, ownerIxs);

  const lamports = initialFundLamports ?? 0n;
  if (lamports > 0n) {
    await fundSwigVault(swigAddress, lamports);
  }

  return {
    swigAddress,
    swigId: Buffer.from(swigIdBytes).toString("base64"),
  };
}

export async function fundSwigVault(
  swigAddress: Address,
  lamports: bigint,
): Promise<string> {
  if (lamports <= 0n) throw new Error("lamports must be > 0");
  const rpc = createSolanaRpc(RPC_URL) as never;
  const swigAccount = await fetchSwig(rpc, swigAddress);
  const vaultAddress = (await getSwigWalletAddress(swigAccount)) as Address;
  return fundAddressFromAdmin(vaultAddress, lamports);
}

export async function fundAddressFromAdmin(
  to: Address,
  lamports: bigint,
): Promise<string> {
  if (lamports <= 0n) throw new Error("lamports must be > 0");
  const adminSigner = await getAdminSigner();
  const ix = buildSolTransferInstruction(
    adminSigner.address as Address,
    to,
    lamports,
  );
  return sendServerTransaction(adminSigner, [ix]);
}

/**
 * In Swig v2, the program signs CPIs as the Swig "system wallet" PDA (not the
 * Swig account PDA). In v1, the Swig account PDA is the wallet.
 *
 * Use this helper whenever passing a `partner_admin` account to the regtech program.
 */
export async function getPartnerAdminAddress(
  swigAddress: Address,
): Promise<Address> {
  const rpc = createSolanaRpc(RPC_URL) as never;
  const swigAccount = await fetchSwig(rpc, swigAddress);
  return (await getSwigWalletAddress(swigAccount)) as Address;
}

// ─── mpl-core collection creation ────────────────────────────────────────────

/**
 * Creates an mpl-core Collection stub for register_partner.
 * updateAuthority must be the Partner PDA (regtech checks collection update authority).
 * Credential NFTs are minted into XCAVATE_GLOBAL_COLLECTION_ADDRESS instead.
 * Admin pays for the account.
 */
export async function createCredentialCollection(
  companyName: string,
  updateAuthority: Address,
): Promise<Address> {
  const adminBytes = loadKeypairBytes("XCAVATE_ADMIN_PRIVATE_KEY");

  const umi = createUmi(RPC_URL);

  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(adminBytes);
  umi.use(keypairIdentity(createSignerFromKeypair(umi, umiKeypair)));

  const collectionSigner = generateSigner(umi);

  await createCollectionV1(umi, {
    collection: collectionSigner,
    name: `${companyName} Credentials`,
    uri: "",
    updateAuthority: umiPublicKey(updateAuthority as string),
  }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

  return collectionSigner.publicKey as unknown as Address;
}

/**
 * Mints a new mpl-core asset into the global credential collection (admin update authority).
 * Returns the new asset address.
 */
export async function mintCredentialNft(
  recipientWallet: Address,
  name: string,
  metadataUri: string,
): Promise<Address> {
  const adminBytes = loadKeypairBytes("XCAVATE_ADMIN_PRIVATE_KEY");

  const umi = createUmi(RPC_URL);
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(adminBytes);
  umi.use(keypairIdentity(createSignerFromKeypair(umi, umiKeypair)));

  const assetSigner = generateSigner(umi);
  const collectionPk = umiPublicKey(XCAVATE_GLOBAL_COLLECTION_ADDRESS);
  const recipientPk = umiPublicKey(recipientWallet);

  await create(umi, {
    asset: assetSigner,
    collection: {
      publicKey: collectionPk,
      oracles: [],
      lifecycleHooks: [],
    },
    owner: recipientPk,
    name,
    uri: metadataUri,
  }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

  return assetSigner.publicKey as unknown as Address;
}
