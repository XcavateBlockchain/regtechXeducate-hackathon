// import { appEnv } from "@/constants/app-env";

// export function getAdminWalletAllowlist(): string[] {
//   const raw = appEnv.XCAVATE_ADMIN_WALLET_ADDRESSES as string | undefined;
//   if (!raw) return [];
//   return raw
//     .split(",")
//     .map((s) => s.trim())
//     .filter(Boolean);
// }

// export function isAdminWalletClient(walletAddress: string | null): boolean {
//   if (!walletAddress) return false;
//   const allowed = getAdminWalletAllowlist();
//   if (allowed.length === 0) return false;
//   return allowed.includes(walletAddress);
// }
