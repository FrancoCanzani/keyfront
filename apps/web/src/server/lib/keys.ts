import { createHash, randomBytes } from "node:crypto";

export type KeyEnvironment = "live" | "test";

// gw_{env}_{short}_{secret}; the short token is public, only the full key is hashed
export function generateKey(environment: KeyEnvironment) {
  const shortToken = randomBytes(6).toString("base64url");
  const secret = randomBytes(24).toString("base64url");
  const rawKey = `gw_${environment}_${shortToken}_${secret}`;
  return {
    rawKey,
    shortToken,
    prefix: `gw_${environment}_${shortToken}`,
    keyHash: createHash("sha256").update(rawKey).digest("hex"),
  };
}
