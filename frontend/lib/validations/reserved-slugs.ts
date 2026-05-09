export const RESERVED_SLUGS = new Set([
  // Open routes
  "dashboard",
  "auth",
  "invite",
  "m",
  "admin",
  "api",

  // Next internals / reserved prefixes
  "_next",

  // Common well-known filenames
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export function isReservedSlug(raw: string): boolean {
  const slug = raw.trim().toLowerCase();
  if (!slug) return false;
  return RESERVED_SLUGS.has(slug);
}
