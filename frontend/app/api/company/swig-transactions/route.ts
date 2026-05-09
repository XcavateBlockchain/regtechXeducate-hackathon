import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appEnv } from "@/constants/app-env";
import { REGTECH_PROGRAM_ADDRESS } from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  walletAddress: z.string().min(32),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  includeAll: z.preprocess(
    (v) => (v === null ? undefined : v),
    z
      .enum(["0", "1"])
      .optional()
      .transform((v) => v === "1"),
  ),
});

type TxRow = {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
};

type CompiledInstructionLike = { programIdIndex: number };
type MessageLike = {
  staticAccountKeys?: unknown[];
  accountKeys?: unknown[];
  compiledInstructions?: CompiledInstructionLike[];
  instructions?: CompiledInstructionLike[];
  getAccountKeys?: () => { staticAccountKeys?: unknown[] };
};
type TransactionLike = { transaction?: { message?: MessageLike } };

function txMentionsRegtechProgram(tx: unknown): boolean {
  const programId = REGTECH_PROGRAM_ADDRESS;
  const message = (tx as TransactionLike)?.transaction?.message;
  if (!message) return false;

  const keys: unknown[] =
    message.staticAccountKeys ??
    message.accountKeys ??
    message.getAccountKeys?.().staticAccountKeys ??
    [];

  const compiled: CompiledInstructionLike[] =
    message.compiledInstructions ?? message.instructions ?? [];
  for (const ix of compiled) {
    const programIndex = ix.programIdIndex;
    if (typeof programIndex !== "number") continue;
    const key = keys[programIndex];
    const keyStr =
      typeof key === "string"
        ? key
        : typeof key === "object" &&
            key !== null &&
            "toBase58" in key &&
            typeof (key as { toBase58?: unknown }).toBase58 === "function"
          ? (key as { toBase58: () => string }).toBase58()
          : null;
    if (keyStr === programId) return true;
  }

  return false;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { walletAddress, limit, includeAll } = querySchema.parse({
      walletAddress: searchParams.get("walletAddress"),
      limit: searchParams.get("limit"),
      includeAll: searchParams.get("includeAll"),
    });

    const company = await prisma.company.findFirst({
      where: { owner: { walletAddress } },
      select: { swigAddress: true },
    });

    if (!company?.swigAddress) {
      return NextResponse.json(
        { error: "Company wallet not found" },
        { status: 404 },
      );
    }

    const connection = new Connection(appEnv.SOLANA_RPC_URL, "confirmed");
    const swigPk = new PublicKey(company.swigAddress);

    const sigs = await connection.getSignaturesForAddress(swigPk, {
      limit: limit ?? 20,
    });

    const out: TxRow[] = [];
    let fetchedTxCount = 0;
    let regtechMatchCount = 0;
    for (const s of sigs) {
      const tx = await connection.getTransaction(s.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!tx) continue;
      fetchedTxCount++;
      const isRegtech = txMentionsRegtechProgram(tx);
      if (isRegtech) regtechMatchCount++;
      if (!includeAll && !isRegtech) continue;
      out.push({
        signature: s.signature,
        slot: s.slot,
        blockTime: s.blockTime ?? null,
        err: s.err,
      });
    }

    return NextResponse.json(
      {
        swigAddress: company.swigAddress,
        signaturesFound: sigs.length,
        transactionsFetched: fetchedTxCount,
        regtechMatched: regtechMatchCount,
        transactions: out,
      },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[GET /api/company/swig-transactions]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
