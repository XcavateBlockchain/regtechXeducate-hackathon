# Wallet & on-chain stack

This app talks to a Solana program (Anchor IDL at `anchor/idl/regtech.json`, program id `Euw5TuM3zX1st2MXnYAz8MfhpetoAEnrf874QMED2FcC`) through four cooperating pieces:

| Layer | Package(s) | Role here |
|---|---|---|
| User wallet | `@phantom/react-sdk`, `@phantom/browser-sdk` | Connect (Google OAuth or injected), sign auth messages |
| Company vault | `@swig-wallet/kit` | Per-company smart wallet; server signs program ix's via a delegate role |
| Program client | `codama` + `@codama/renderers-js` (gen) → `@/generated/reg_tech` | Typed instruction builders, account decoders, PDA finders |
| RPC + tx | `@solana/kit`, `@solana/react-hooks`, `@solana/signers`, `@solana/transactions` | RPC singleton, transaction message build/sign/send, React `useSendTransaction` |

Versions are pinned in `package.json` (`@phantom/react-sdk@1.0.7`, `@swig-wallet/kit@^1.9.1`, `@solana/kit@^6.8.0`, `@solana/react-hooks@^1.4.1`, `codama@^1.6.0`).

---

## 1. Phantom (user wallet)

### Provider

The Phantom provider wraps the whole tree in `providers/index.tsx` (so `SolanaWalletProvider` is the outermost wallet provider). The actual config lives in `providers/solana-provider.tsx`:

```ts
export default function SolanaWalletProvider({ children }: PropsWithChildren) {
  const redirectUrl = getPhantomRedirectUrl();

  return (
    <PhantomProvider
      config={{
        providers: ["google", "injected"],
        appId: APP_ID ?? "",
        addressTypes: [AddressType.solana],
        authOptions: {
          redirectUrl,
        },
      }}
      theme={customTheme}
      appName="Regtech"
    >
      {children}
    </PhantomProvider>
  );
}
```

Key points verified in code:

- `providers: ["google", "injected"]` — supports embedded Google OAuth and an injected Phantom wallet.
- `addressTypes: [AddressType.solana]` — Solana only.
- `redirectUrl` is computed by `getPhantomRedirectOrigin` so tenant subdomains fall back to the canonical `NEXT_PUBLIC_APP_URL` origin (Phantom Portal requires every redirect to be allowlisted).
- `NEXT_PUBLIC_PHANTOM_APP_ID` must be set; a console warning fires if it's missing.

### `useWalletKit` — the wallet façade

`hooks/use-wallet-kit.ts` is the single entry point components use. It wraps `useAccounts`, `useDisconnect`, `useModal`, `usePhantom` from `@phantom/react-sdk` and pairs it with our wallet/auth modal state:

```ts
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
  // ...
}
```

Use it for `address`, `isConnected`, `open()`, `close()`, `toggleModal()`, `handleDisconnect()`. The OAuth callback page that finishes the flow lives at `app/auth/callback/page.tsx` and re-uses `<ConnectBox />` from `@phantom/react-sdk`.

### Signing for backend auth

We don't trust client claims of identity — backend auth is gated on a Phantom signature over a deterministic message:

- Build the message: `lib/phantom-auth-message.ts` produces a fixed-shape string with `Purpose`, `Resource`, `Wallet`, `Timestamp`. The shape is asserted byte-for-byte server-side.
- Client signs it: `features/auth/login-form.tsx` calls `solana.signMessage(message)` from `useSolana()`.
- Normalize the signature: Phantom returns several shapes; `lib/phantom-signature.ts` (`toBase58Signature`) coerces to base58.
- Verify: `lib/phantom-auth.ts` (`verifyPhantomAuthPayload`) re-builds the expected message, decodes the signature, derives the pubkey from the address, and checks `nacl.sign.detached.verify`. It also enforces a 5-min timestamp window for replay defense:

```ts
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
```

Note: this is **only** used for HTTP auth (login, invite claim, module join). It is *not* used to authorize on-chain writes — those go through Swig (next section).

### Phantom as a transaction signer (when needed)

If a code path ever wants the user's Phantom session to sign a transaction (vs. the server signing it), the adapter is `lib/solana/phantom-wallet-session.ts`:

```ts
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
```

It exposes `WalletSession` so `@solana/react-hooks`' `useSendTransaction` can sign via Phantom. Currently most write paths flow through the server + Swig delegate, so this exists as the bridge for any client-signed paths.

---

## 2. Swig wallet (company vault, server-signed)

Each company gets its own Swig PDA, created at registration (`POST /api/auth/register`). The server admin keypair (`XCAVATE_ADMIN_PRIVATE_KEY`) is the **root authority + delegate**; the company owner is added as a **restricted authority** that's only allowed to call our regtech program.

This means:

- Owners do not need to sign Solana transactions for normal operations.
- The platform pays fees and signs program instructions on behalf of the company, but **only inside the regtech program** for the owner's role.
- The Swig is also the funded SOL vault that the program debits for quiz allocations, etc.

### Creating the company Swig

`lib/solana/admin.ts`:

```ts
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
  // ...
}
```

The admin/delegate role gets `Actions.set().all()`; the owner role gets `Actions.set().programLimit({ programId: REGTECH_PROGRAM_ADDRESS })`.

### Signing a program instruction via Swig delegate

The server takes any Codama-built instruction and wraps it through Swig before broadcasting:

```ts
export async function executeViaSwigDelegate(
  swigAddress: Address,
  instruction: Instruction,
): Promise<string> {
  const rpc = createSolanaRpc(RPC_URL) as never;
  const delegateSigner = await getAdminSigner();

  const swigAccount = await fetchSwig(rpc, swigAddress);
  const roleId = await findDelegateRoleId(swigAccount);

  const signIxs = (await getSignInstructions(swigAccount, roleId, [
    instruction as never,
  ])) as unknown as Instruction[];

  return sendServerTransaction(delegateSigner, signIxs);
}
```

Two things to know:

- **`partner_admin` is the Swig wallet PDA, not the Swig account PDA.** Swig v2 splits the two; always pass `getPartnerAdminAddress()` (which calls `getSwigWalletAddress`) for any account the regtech program treats as the partner authority.
- **Type cast `as never` / `as unknown as Instruction[]` is intentional** — `@swig-wallet/kit` ships its own bundled `@solana/kit` v2 types; runtime shape matches our v6, the cast is to bridge nominal types. Don't "fix" it.

### Funding the vault

- `fundSwigVault(swigAddress, lamports)` looks up the Swig wallet PDA and sends a system transfer from admin.
- `fundAddressFromAdmin(to, lamports)` is the lower-level helper.
- Funding requests follow a request → approve → transfer flow (`app/api/company/fund-swig/*`), and approvals can be auto-granted via `lib/funding-auto-approve.ts`.

### Reading Swig state (client side)

`hooks/use-swig.ts` decodes a Swig account from its PDA via `fetchSwig`:

```ts
export function useSwigAccount(
  swigAddress: Address | null,
): UseSwigAccountReturn {
  const [swig, setSwig] = useState<Swig | null>(null);
  // ...
  useEffect(() => {
    if (!swigAddress) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const account = await fetchSwig(rpc as never, swigAddress);
        if (!cancelled) setSwig(account);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [swigAddress]);
  // ...
}
```

The `rpc as never` cast is the same v2/v6 bridge as above.

---

## 3. Codama (program client codegen)

Codama generates the typed TypeScript client for the regtech Anchor program. No instruction builders are written by hand.

### Config

`codama.json` declares the IDL source and JS render target:

```json
{
  "idl": "./anchor/idl/regtech.json",
  "before": [],
  "scripts": {
    "js": [
      {
        "from": "@codama/renderers-js",
        "args": [
          "generated/reg_tech",
          {
            "generatedFolder": "."
          }
        ]
      }
    ]
  }
}
```

Run codegen with `bun run codama:js` (script in `package.json` → `codama run js`). Output goes to `generated/reg_tech/{accounts,errors,instructions,pdas,programs}` and is re-exported from `generated/reg_tech/index.ts`.

### What Codama gives us

For every Anchor instruction we get a paired sync + async builder, e.g. `getRegisterPartnerInstructionAsync`, `getEnrollUserInstructionAsync`, `getStartAttemptInstructionAsync`. `Async` variants resolve PDAs and dependent accounts automatically. For accounts/PDAs we get `findConfigPda`, `findPartnerPda`, `fetchMaybeConfig`, `fetchMaybePartner`, `fetchMaybeAttempt`, etc., plus the program address constant `REGTECH_PROGRAM_ADDRESS`.

The hand-written PDAs that Codama doesn't model live in `lib/solana/pda.ts` (`findModulePda`, `findEnrollmentPda`, `findAttemptPda`, `findCredentialPda`) — seeds are kept in sync with the on-chain program by hand; verify against on-chain errors if changed.

### Typical use (server)

`app/api/auth/register/route.ts` is the canonical example: derive PDAs with Codama, build with `getRegisterPartnerInstructionAsync`, send via the admin signer:

```ts
const registerIx = await getRegisterPartnerInstructionAsync({
  admin: adminSigner,
  partner: partnerPda,
  collection: collectionAddress,
  partnerAdmin: partnerAdminWallet,
  attestor: adminSigner.address as Address,
  partnerId: partnerIdBytes,
  name: companyName,
  passThresholdBpsOverride: none(),
  cooldownSecondsOverride: none(),
});

const txHash = await sendServerTransaction(adminSigner, [registerIx]);
```

### Typical use (Swig-delegated, server)

`lib/server/enroll.ts` builds an `enrollUser` ix where the partner authority is a noop signer (because the actual signer comes from Swig), then hands the ix to `executeViaSwigDelegate`:

```ts
const partnerAdminWallet = await getPartnerAdminAddress(
  company.swigAddress as Address,
);
const ix = await getEnrollUserInstructionAsync({
  partnerAdmin: createNoopSigner(partnerAdminWallet),
  user: employeeUser.walletAddress as Address,
  partner: partnerPda,
  module: modulePda,
  enrollment: enrollmentPda,
  reasonCode,
});

const txHash = await executeViaSwigDelegate(
  company.swigAddress as Address,
  ix as never,
);
```

`createNoopSigner` from `@solana/signers` is the standard pattern when you want a typed signer slot but the real signature comes from somewhere else (Swig in this case).

---

## 4. Solana Kit + React Hooks

Two complementary packages from the new `@solana/*` stack:

- `@solana/kit` — RPC clients, address/instruction/transaction primitives, encoders.
- `@solana/react-hooks` — React bindings: `useSendTransaction`, `useWalletConnection`, etc.

### RPC singletons

`hooks/use-contract.ts` builds the cluster RPC + subscription client once:

```ts
const { SOLANA_RPC_URL: RPC_URL } = appEnv;

export const rpc = createSolanaRpc(RPC_URL);
export const rpcSubscriptions = createSolanaRpcSubscriptions(
  RPC_URL.replace("https://", "wss://"),
);
```

Re-use these (`hooks/use-swig.ts` imports `rpc` from here). Server code creates fresh `createSolanaRpc(RPC_URL)` instances per call (`lib/solana/admin.ts`).

### Reading accounts (React)

The hooks pattern is: derive a PDA, fetch with the typed Codama fetcher, store in state. Example:

```ts
export function useConfigAccount() {
  const [config, setConfig] = useState<MaybeAccount<Config> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [address] = await findConfigPda();
        const account = await fetchMaybeConfig(rpc, address);
        if (!cancelled) setConfig(account);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { config, loading, error };
}
```

Same shape for `usePartnerAccount`, `useAttemptAccount`.

### Sending transactions (React)

`useSendTransaction` from `@solana/react-hooks` is wrapped by the generic `useAction` helper that takes any Codama instruction builder + a `feePayer` and produces an `execute(input)`:

```ts
function useAction<T>(
  buildInstruction: (input: T) => Promise<Instruction> | Instruction,
  feePayer: TransactionPrepareAndSendRequest["feePayer"],
): ActionHook<T> {
  const [state, setState] = useState<ActionResult>({
    signature: null,
    error: null,
    loading: false,
  });
  const sender = useSendTransaction();

  const execute = useCallback(
    async (input: T) => {
      setState({ signature: null, error: null, loading: true });
      try {
        const ix = await Promise.resolve(buildInstruction(input));
        const sig = await sender.send({ instructions: [ix], feePayer });
        setState({ signature: String(sig), error: null, loading: false });
      } catch (e) {
        setState({ signature: null, error: e as Error, loading: false });
      }
    },
    [buildInstruction, feePayer, sender],
  );

  return { ...state, execute };
}
```

Each program call gets a one-liner hook on top: `useInitializeConfig`, `useRegisterPartner`, `useEnrollUser`, `useStartAttempt`, `useSubmitAttempt`, `useClaimCredential`, `useSetPaused`, `useFundPartner` (`hooks/use-contract.ts`).

`feePayer` here is whatever wallet session is plumbed into `useSendTransaction` — most production paths instead go through the server + Swig delegate, but this is the path if you ever want to have the user's wallet pay.

### Sending transactions (server)

Server-side we don't use react-hooks; we build, sign, send, and wait for confirmation manually. `lib/solana/admin.ts` `sendServerTransaction`:

```ts
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
```

This is the canonical "build a transaction with `@solana/kit`" recipe: `pipe` + `setTransactionMessage*` + `signTransactionMessageWithSigners` + `getBase64EncodedWireTransaction`. `waitForConfirmation` polls `getSignatureStatuses` for up to 30s.

---

## End-to-end flows (where the four meet)

### Login

1. User clicks Connect → `connect({ provider: "google" })` from `@phantom/react-sdk` (`features/auth/login-form.tsx`).
2. After redirect, `app/auth/callback/page.tsx` finalizes the Phantom session.
3. `LoginForm.onSubmit`: build a deterministic auth message → `solana.signMessage(...)` → POST to `/api/auth/login`.
4. Server runs `verifyPhantomAuthPayload` (nacl ed25519 check) and returns `{userId, role, companyId}`.

No on-chain writes; Swig/Codama not involved.

### Owner registration (`POST /api/auth/register`)

1. Server creates Swig PDA — admin = root authority, owner = program-limited authority. Funds it with `INITIAL_SWIG_FUND_LAMPORTS`.
2. Creates the `mpl-core` collection with `createCredentialCollection` (admin pays, partner PDA = update authority).
3. Builds `register_partner` ix via Codama (`getRegisterPartnerInstructionAsync`).
4. `sendServerTransaction(admin, [registerIx])` → confirm → flip `txConfirmed` in Postgres.

Phantom not involved on-chain — admin signs.

### Start a quiz attempt (`POST /api/module/[moduleId]/start`)

1. Resolve PDAs: `findPartnerPda` (Codama), `findModulePda` / `findEnrollmentPda` / `findAttemptPda` (hand-rolled, `lib/solana/pda.ts`).
2. If user not enrolled on-chain, build `enroll_user` (Codama), wrap with `executeViaSwigDelegate` so the company Swig signs the enrollment.
3. If `Attempt` PDA doesn't exist, build `start_attempt` (Codama) and `sendServerTransaction(adminAttestor, [startIx])` — attestor signs directly, no Swig wrap.
4. Pick a random batch, persist `AssessmentAttempt`, return questions.

Phantom never signs — server orchestrates everything.

---

## Mental model

- **Phantom** = how the user proves *who they are* and (only when needed) signs *user-paid* transactions.
- **Swig** = how the *company* signs program instructions without making the owner pay or co-sign every action; the platform admin is a delegate role inside that vault.
- **Codama** = compiler from IDL → typed instruction builders / PDA finders / account decoders. Always re-run after the program changes.
- **`@solana/kit` + `@solana/react-hooks`** = the underlying RPC, transaction, and React glue. Server uses kit directly (`pipe`, `signTransactionMessageWithSigners`); client uses `useSendTransaction` for any user-signed paths.