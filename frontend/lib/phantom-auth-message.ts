export function buildPhantomAuthMessage(input: {
  purpose: "login" | "invite-claim" | "module-join";
  resourceId: string; // invite token, shareToken, or "login"
  walletAddress: string;
  timestampIso: string;
}) {
  // Keep this format stable: backend checks exact string match.
  // Resource binding prevents replaying a signature across endpoints.
  return [
    "Regtech authentication",
    "",
    `Purpose: ${input.purpose}`,
    `Resource: ${input.resourceId}`,
    `Wallet: ${input.walletAddress}`,
    `Timestamp: ${input.timestampIso}`,
  ].join("\n");
}
