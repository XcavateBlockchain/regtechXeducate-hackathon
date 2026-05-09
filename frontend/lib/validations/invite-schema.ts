import { z } from "zod";

export const inviteCreateSchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32), // caller wallet
  email: z.email("Invalid email address"),
  inviteeName: z
    .string()
    .min(1, "Employee name is required")
    .max(200, "Name too long"),
  permission: z.enum(["ISSUER", "REVIEWER", "AUDITOR"]).default("REVIEWER"),
  jobTitle: z.string().max(200).optional(),
  department: z.string().max(200).optional(),
});

export const inviteClaimSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  walletAddress: z.string().min(32, "Wallet address is required"),
});

export type InviteCreateInput = z.input<typeof inviteCreateSchema>;
export type InviteClaimInput = z.input<typeof inviteClaimSchema>;
