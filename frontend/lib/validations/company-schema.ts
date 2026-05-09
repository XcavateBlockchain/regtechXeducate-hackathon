import z from "zod";
import { isReservedSlug } from "@/lib/validations/reserved-slugs";

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  slug: z
    .string()
    .min(2, "Company slug is required")
    .refine((s) => !isReservedSlug(s), { message: "This handle is reserved" }),
  description: z
    .string()
    .max(2000, "Company description must be less than 2000 characters"),
  logoUrl: z.string().url("Logo URL must be a valid URL"),
  website: z.string().url("Website URL must be a valid URL"),
  email: z.string().email("Owner email must be a valid email address"),
});
