import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 30 * 60_000;

function secret() {
  return process.env.REFERENCE_SECRET ?? "dev-reference-secret";
}

function sign(hostKey: string, exp: number) {
  return createHmac("sha256", secret())
    .update(`${hostKey}.${exp}`)
    .digest("base64url");
}

export function mintReferenceToken(hostKey: string) {
  const exp = Date.now() + TOKEN_TTL_MS;
  return `${exp}.${sign(hostKey, exp)}`;
}

export function verifyReferenceToken(hostKey: string, token: string) {
  const [expRaw, signature] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now() || !signature) return false;
  const expected = Buffer.from(sign(hostKey, exp));
  const actual = Buffer.from(signature);
  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}
