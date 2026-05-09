/**
 * src/hooks/use-reg-tech.ts
 *
 * High-level React hooks wrapping the generated Codama client.
 * Uses @solana/react-hooks for transaction sending and the generated Codama
 * helpers for PDA derivation + account fetching.
 */

import type { TransactionPrepareAndSendRequest } from "@solana/client";
import type { Address, Instruction, MaybeAccount } from "@solana/kit";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { useSendTransaction } from "@solana/react-hooks";
import { useCallback, useEffect, useState } from "react";
import { appEnv } from "@/constants/app-env";
import {
  type Attempt,
  type ClaimCredentialAsyncInput,
  type Config,
  type EnrollUserInput,
  type FundPartnerAsyncInput,
  fetchMaybeAttempt,
  fetchMaybeConfig,
  fetchMaybePartner,
  findConfigPda,
  findPartnerPda,
  getClaimCredentialInstructionAsync,
  getEnrollUserInstruction,
  getFundPartnerInstructionAsync,
  getInitializeConfigInstructionAsync,
  getRegisterPartnerInstructionAsync,
  getSetPausedInstructionAsync,
  getStartAttemptInstructionAsync,
  getSubmitAttemptInstructionAsync,
  type InitializeConfigAsyncInput,
  type Partner,
  type RegisterPartnerAsyncInput,
  type SetPausedAsyncInput,
  type StartAttemptAsyncInput,
  type SubmitAttemptAsyncInput,
} from "@/generated/reg_tech";

// ─── RPC singleton (configure to your cluster endpoint) ───────────────────────

const { SOLANA_RPC_URL: RPC_URL } = appEnv;

export const rpc = createSolanaRpc(RPC_URL);
export const rpcSubscriptions = createSolanaRpcSubscriptions(
  RPC_URL.replace("https://", "wss://"),
);

// ─── useConfigAccount ─────────────────────────────────────────────────────────

/** Fetches and decodes the global Config PDA. */
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
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading, error };
}

// ─── usePartnerAccount ────────────────────────────────────────────────────────

/** Fetches and decodes a Partner PDA given its 16-byte ID. */
export function usePartnerAccount(partnerId: Uint8Array | null) {
  const [partner, setPartner] = useState<MaybeAccount<Partner> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [address] = await findPartnerPda({ partnerId });
        const account = await fetchMaybePartner(rpc, address);
        if (!cancelled) setPartner(account);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  return { partner, loading, error };
}

// ─── useAttemptAccount ────────────────────────────────────────────────────────

/** Fetches and decodes an Attempt PDA given its address. */
export function useAttemptAccount(attemptAddress: Address | null) {
  const [attempt, setAttempt] = useState<MaybeAccount<Attempt> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!attemptAddress) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const account = await fetchMaybeAttempt(rpc, attemptAddress);
        if (!cancelled) setAttempt(account);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptAddress]);

  return { attempt, loading, error };
}

// ─── Action hooks ──────────────────────────────────────────────────────────────

type ActionResult = {
  signature: string | null;
  error: Error | null;
  loading: boolean;
};
type ActionHook<T> = ActionResult & { execute: (input: T) => Promise<void> };

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

/** Hook to call `initialize_config`. */
export function useInitializeConfig(
  feePayer: TransactionPrepareAndSendRequest["feePayer"],
) {
  return useAction<InitializeConfigAsyncInput>(
    getInitializeConfigInstructionAsync,
    feePayer,
  );
}

/** Hook to call `register_partner`. */
export function useRegisterPartner(
  feePayer: TransactionPrepareAndSendRequest["feePayer"],
) {
  return useAction<RegisterPartnerAsyncInput>(
    getRegisterPartnerInstructionAsync,
    feePayer,
  );
}

/** Hook to call `enroll_user`. */
export function useEnrollUser(
  feePayer: TransactionPrepareAndSendRequest["feePayer"],
) {
  return useAction<EnrollUserInput>(getEnrollUserInstruction, feePayer);
}

/** Hook to call `start_attempt`. */
export function useStartAttempt(
  feePayer: TransactionPrepareAndSendRequest["feePayer"],
) {
  return useAction<StartAttemptAsyncInput>(
    getStartAttemptInstructionAsync,
    feePayer,
  );
}

/** Hook to call `submit_attempt`. */
export function useSubmitAttempt(
  feePayer: TransactionPrepareAndSendRequest["feePayer"],
) {
  return useAction<SubmitAttemptAsyncInput>(
    getSubmitAttemptInstructionAsync,
    feePayer,
  );
}

/** Hook to call `claim_credential`. */
export function useClaimCredential(
  feePayer: TransactionPrepareAndSendRequest["feePayer"],
) {
  return useAction<ClaimCredentialAsyncInput>(
    getClaimCredentialInstructionAsync,
    feePayer,
  );
}

/** Hook to call `set_paused`. */
export function useSetPaused(
  feePayer: TransactionPrepareAndSendRequest["feePayer"],
) {
  return useAction<SetPausedAsyncInput>(getSetPausedInstructionAsync, feePayer);
}

/** Hook to call `fund_partner`. */
export function useFundPartner(
  feePayer: TransactionPrepareAndSendRequest["feePayer"],
) {
  return useAction<FundPartnerAsyncInput>(
    getFundPartnerInstructionAsync,
    feePayer,
  );
}
