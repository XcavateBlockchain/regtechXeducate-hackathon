import type { Address } from "@solana/kit";
import { createNoopSigner } from "@solana/signers";
import {
  findPartnerPda,
  getEnrollUserInstructionAsync,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import {
  executeViaSwigDelegate,
  getPartnerAdminAddress,
  uuidToBytes,
} from "@/lib/solana/admin";
import { findEnrollmentPda, findModulePda } from "@/lib/solana/pda";

export async function enrollEmployeeUserOnChain(input: {
  companyId: string;
  walletAddress: string; // caller
  employeeUserId: string; // User.id
  moduleId: string;
  reasonCode: number;
}): Promise<{
  txHash: string;
  enrollmentAddress: string;
}> {
  const { companyId, walletAddress, employeeUserId, moduleId, reasonCode } =
    input;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { owner: true },
  });
  if (!company) throw new Error("Company not found");
  if (!company.txConfirmed || !company.swigAddress) {
    throw new Error("Company not yet registered on-chain");
  }

  // Allow OWNER or any ISSUER-permission employee.
  const isOwner = company.owner.walletAddress === walletAddress;
  if (!isOwner) {
    const emp = await prisma.employee.findFirst({
      where: { companyId, user: { walletAddress }, permission: "ISSUER" },
      select: { id: true },
    });
    if (!emp) throw new Error("Unauthorized");
  }

  const module = await prisma.module.findFirst({
    where: { id: moduleId, companyId },
    select: { moduleIdHash: true },
  });
  if (!module?.moduleIdHash) {
    throw new Error("Module not found or not yet registered on-chain");
  }

  const employeeUser = await prisma.user.findUnique({
    where: { id: employeeUserId },
    select: { walletAddress: true },
  });
  if (!employeeUser) throw new Error("Employee user not found");

  const partnerIdBytes = uuidToBytes(company.partnerId);
  const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
  const [modulePda] = await findModulePda(partnerIdBytes, module.moduleIdHash);
  const [enrollmentPda] = await findEnrollmentPda(
    employeeUser.walletAddress as Address,
    partnerIdBytes,
    module.moduleIdHash,
  );

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

  return { txHash, enrollmentAddress: enrollmentPda };
}
