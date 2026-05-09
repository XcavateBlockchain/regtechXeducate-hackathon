import bs58 from "bs58";

type SignMessageResult =
  | string
  | Uint8Array
  | ArrayBuffer
  | { signature: string | Uint8Array | ArrayBuffer | number[] };

function toUint8Array(input: unknown): Uint8Array | null {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (Array.isArray(input) && input.every((v) => typeof v === "number")) {
    return new Uint8Array(input);
  }
  return null;
}

/**
 * Phantom `signMessage` can return bytes in several shapes depending on SDK/runtime.
 * Our API expects a base58 signature string.
 */
export function toBase58Signature(signed: SignMessageResult): string {
  if (typeof signed === "string") return signed;

  const directBytes = toUint8Array(signed);
  if (directBytes) return bs58.encode(directBytes);

  if (signed && typeof signed === "object") {
    const maybe = signed as Partial<{
      signature: string | Uint8Array | ArrayBuffer | number[];
    }>;
    const sig = maybe.signature;
    if (typeof sig === "string") return sig;
    const bytes = toUint8Array(sig);
    if (bytes) return bs58.encode(bytes);
  }

  throw new Error("Unsupported signature format from wallet");
}
