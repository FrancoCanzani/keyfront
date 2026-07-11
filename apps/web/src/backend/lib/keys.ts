import { createHash, randomBytes } from "node:crypto";

export type GeneratedKey = {
  plaintext: string;
  hash: string;
  prefix: string;
};

export function generateApiKey(mode: "live" | "test" = "live"): GeneratedKey {
  const plaintext = `kf_${mode}_${randomBytes(24).toString("base64url")}`;
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: plaintext.slice(0, 12),
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateGatewaySecret(): string {
  return randomBytes(32).toString("base64url");
}
