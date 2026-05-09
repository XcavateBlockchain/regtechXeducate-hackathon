import type { QuestionInput } from "@/constants/customers-batch";

import fcaInvestmentJson from "@/constants/fca-investsment.json";
import fcaRegulatedJson from "@/constants/fca-regulated.json";
import secFrameworkJson from "@/constants/sec-framework.json";

type Batch = {
  id: string;
  questions: QuestionInput[];
};

type BankJson = {
  batches: Batch[];
};

function coerceBank(name: string, value: unknown): Batch[] {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid quiz bank JSON: ${name}`);
  }

  const batches = (value as Partial<BankJson>).batches;
  if (!Array.isArray(batches)) {
    throw new Error(`Invalid quiz bank JSON: ${name}`);
  }

  return batches;
}

export const fcaInvestmentBatches = coerceBank(
  "fca-investsment.json",
  fcaInvestmentJson,
);
export const fcaRegulatedBatches = coerceBank(
  "fca-regulated.json",
  fcaRegulatedJson,
);
export const secFrameworkBatches = coerceBank(
  "sec-framework.json",
  secFrameworkJson,
);
