import { appEnv } from "@/constants/app-env";

export function isAdminWallet(walletAddress: string): boolean {
  const admin = appEnv.XCAVATE_ADMIN_PUBLIC_KEY;
  if (!admin) return false;
  return walletAddress === admin;
}

export class AdminForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AdminForbiddenError";
  }
}

export function assertAdminWallet(walletAddress: string): void {
  if (!isAdminWallet(walletAddress)) {
    throw new AdminForbiddenError();
  }
}
