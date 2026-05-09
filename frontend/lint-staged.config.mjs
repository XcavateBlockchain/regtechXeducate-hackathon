export default {
  "*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}": () => [
    "bun x biome check --write --no-errors-on-unmatched",
  ],
};
