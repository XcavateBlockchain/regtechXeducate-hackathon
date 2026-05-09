import { FundingRequestStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const MIN_AUTO_FUND_LAMPORTS = 200_000_000n; // 0.2 SOL
export const AUTO_FUND_LAMPORTS = 500_000_000n; // 0.5 SOL

export function startOfTodayUtc(now = new Date()): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
    ),
  );
}

export async function shouldAutoApproveFundingRequest(input: {
  companyId: string;
}): Promise<boolean> {
  const since = startOfTodayUtc();
  const existingApprovedToday = await prisma.fundingRequest.findFirst({
    where: {
      companyId: input.companyId,
      status: FundingRequestStatus.APPROVED,
      decidedAt: { gte: since },
    },
    select: { id: true },
  });

  return existingApprovedToday === null;
}
