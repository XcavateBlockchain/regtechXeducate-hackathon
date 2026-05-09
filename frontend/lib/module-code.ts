import { randomUUID } from "node:crypto";

/**
 * Mirrors `MAX_MODULE_CODE_LEN` in the on-chain regtech program
 * (programs/regtech/src/constants.rs). The program rejects
 * `register_module` with `StringTooLong` (#6008) when this is exceeded.
 */
export const MAX_MODULE_CODE_LEN = 64;

/** "-XXXXXXXX" — dash + first 8 hex chars of a UUID. */
const SUFFIX_LEN = 9;

/**
 * Derives the on-chain `module_code` from a human title.
 *
 * The slug uses only `[a-z0-9-]`, so byte length equals char length.
 * The slug is truncated so the final code (slug + "-" + 8 hex) fits
 * within `MAX_MODULE_CODE_LEN`.
 */
export function buildModuleCode(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const maxSlug = MAX_MODULE_CODE_LEN - SUFFIX_LEN;
  const truncated = slug.slice(0, maxSlug).replace(/-+$/, "");

  return `${truncated}-${randomUUID().slice(0, 8)}`;
}
