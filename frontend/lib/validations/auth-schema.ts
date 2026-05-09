import { z } from "zod";
import { isReservedSlug } from "@/lib/validations/reserved-slugs";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const userSchema = z.object({
  walletAddress: z.string().min(1, "Wallet address is required"),
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  role: z.enum(["OWNER", "EMPLOYEE", "USER"]),
});

export const authSchema = userSchema.extend({
  role: z.literal("OWNER"),
  companyName: z
    .string()
    .min(1, "Company name is required")
    .max(120, "Company name must be less than 120 characters"),
  companySlug: z
    .string()
    .max(64)
    .refine(
      (s) => {
        const t = s.trim();
        return t === "" || t.length >= 2;
      },
      { message: "Handle must be at least 2 characters when set" },
    )
    .refine(
      (s) => {
        const t = s.trim();
        return t === "" || slugRegex.test(t);
      },
      {
        message:
          "Use lowercase letters, numbers, and single hyphens between words",
      },
    )
    .refine(
      (s) => {
        const t = s.trim();
        return t === "" || !isReservedSlug(t);
      },
      { message: "This handle is reserved" },
    ),
  industry: z.enum(["Real Estate", "Marketplace", "Defi", "Other"]),
  description: z.string().max(2000),
});

export const loginSchema = z.object({
  email: userSchema.shape.email,
});

export type UserInput = z.input<typeof userSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type UserValues = z.infer<typeof userSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
export type AuthValues = z.infer<typeof authSchema>;
