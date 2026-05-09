import { z } from "zod";

export const CATEGORY_OPTIONS = [
  { value: "securities", label: "Securities" },
  { value: "aml", label: "Anti-Money Laundering" },
  { value: "kyc", label: "KYC" },
  { value: "defi", label: "DeFi" },
  { value: "tax", label: "Tax & Reporting" },
];

export const MODULE_TYPE_OPTIONS = [
  { value: "fca_investment", label: "FCA Investment" },
  { value: "fca_regulated", label: "FCA Regulated" },
  { value: "sec_framework", label: "SEC Framework" },
];

export const TIME_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
];

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
];

const MAX_IMAGE_BYTES = 50 * 1024 * 1024; // 50MB
// const ACCEPTED_IMAGE_TYPES = [
//   "image/jpeg",
//   "image/png",
//   "image/webp",
//   "image/jpg",
// ];

const imageFile = z
  .instanceof(File, { message: "An image is required" })
  .refine((f) => f.size <= MAX_IMAGE_BYTES, "Image must be 5MB or smaller");
// .refine(
//   (f) => ACCEPTED_IMAGE_TYPES.includes(f.type),
//   "Image must be JPEG, PNG, or WebP or JPG",
// );

const optionalThumbnailFile = imageFile.optional();

const coreModuleObjectSchema = z.object({
  mode: z.enum(["manual", "ai"]),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(80, "Title must be 80 characters or fewer"),
  description: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(500, "Description must be 500 characters or fewer"),
  category: z.enum(["securities", "aml", "kyc", "defi", "tax"], {
    message: "Please select a category",
  }),
  completionTime: z.enum(["15", "30", "45", "60", "90"], {
    message: "Please select an estimated completion time",
  }),
  language: z.enum(["en", "es", "fr", "de", "zh"], {
    message: "Please select a language",
  }),
  passingScore: z.coerce
    .number({ message: "Passing score must be a number" })
    .int("Passing score must be a whole number")
    .min(1, "Score cannot be negative")
    .max(100, "Score cannot exceed 100"),
  recipients: z.coerce
    .number({ message: "Recipients must be a number" })
    .int("Recipients must be a whole number")
    .min(1, "Add at least one recipient")
    .max(10000, "Maximum is 10,000 recipients"),
  // Quiz attempt timer (minutes). 0 / undefined = unlimited.
  quizTimeLimitMinutes: z.coerce
    .number({ message: "Time limit must be a number" })
    .int("Time limit must be a whole number")
    .min(0, "Time limit cannot be negative")
    .max(180, "Time limit cannot exceed 180 minutes")
    .optional(),
  // Minimum wait between attempts (hours). On-chain: cooldown_seconds.
  cooldownHours: z.coerce
    .number({ message: "Cooldown must be a number" })
    .int("Cooldown must be a whole number")
    .min(0, "Cooldown cannot be negative")
    .max(24 * 365, "Cooldown is too long")
    .default(24),
  // Credential validity (months). 0 / undefined = never expires. On-chain: expires_in_seconds.
  credentialExpiryMonths: z.coerce
    .number({ message: "Expiry must be a number" })
    .int("Expiry must be a whole number")
    .min(0, "Expiry cannot be negative")
    .max(120, "Expiry cannot exceed 120 months")
    .optional(),
  /** Set when editing a draft that already has a thumbnail in storage */
  existingThumbnailUrl: z.string().url().optional(),
  thumbnailImage: optionalThumbnailFile,
  contents: z.array(imageFile),
});

function requireThumbnailOrExisting(
  data: {
    thumbnailImage?: File | undefined;
    existingThumbnailUrl?: string | undefined;
  },
  ctx: z.RefinementCtx,
) {
  const hasNewThumb =
    data.thumbnailImage instanceof File && data.thumbnailImage.size > 0;
  const hasExistingThumb =
    typeof data.existingThumbnailUrl === "string" &&
    data.existingThumbnailUrl.length > 0;
  if (!hasNewThumb && !hasExistingThumb) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "An image is required",
      path: ["thumbnailImage"],
    });
  }
}

export const moduleSchema = coreModuleObjectSchema.superRefine(
  requireThumbnailOrExisting,
);

export type ModuleInput = z.input<typeof moduleSchema>;
export type ModuleValues = z.infer<typeof moduleSchema>;

export const moduleWithQuizSchema = coreModuleObjectSchema
  .extend({
    moduleType: z.enum(["fca_investment", "fca_regulated", "sec_framework"], {
      message: "Select a module type",
    }),
  })
  .superRefine(requireThumbnailOrExisting);

export type ModuleWithQuizInput = z.input<typeof moduleWithQuizSchema>;
export type ModuleWithQuizValues = z.infer<typeof moduleWithQuizSchema>;
