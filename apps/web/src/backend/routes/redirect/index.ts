import { eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { link } from "../../db/schema/link";
import {
  type CachedLink,
  LINKS_CACHE_TTL_SECONDS,
  linkCacheKey,
} from "../../lib/links-cache";
import { parseUserAgent } from "../../lib/user-agent";
import type { AppRouteEnv } from "../../types";

function isBotRequest(cf: IncomingRequestCfProperties | undefined): boolean {
  if (cf?.verifiedBotCategory) return true;
  const score = cf?.botManagement?.score;
  return typeof score === "number" && score < 30;
}

function logClick(c: Context<AppRouteEnv>, key: string) {
  // Request.cf is ambiently typed as the outgoing RequestInitCfProperties;
  // for an incoming request it's actually IncomingRequestCfProperties.
  const cf = c.req.raw.cf as IncomingRequestCfProperties | undefined;
  const { device, os, browser } = parseUserAgent(
    c.req.raw.headers.get("user-agent"),
  );

  c.env.LINK_CLICKS.writeDataPoint({
    indexes: [key],
    blobs: [
      key,
      String(cf?.country ?? "unknown"),
      String(cf?.city ?? "unknown"),
      String(cf?.colo ?? "unknown"),
      c.req.raw.headers.get("referer") ?? "direct",
      device,
      os,
      browser,
      isBotRequest(cf) ? "bot" : "human",
    ],
  });
}

export const redirect = new Hono<AppRouteEnv>().get("/:key", async (c) => {
  const key = c.req.param("key");
  const cacheKey = linkCacheKey(key);
  const start = performance.now();

  try {
    let record = await c.env.LINKS_CACHE.get<CachedLink>(cacheKey, "json");

    if (!record) {
      const db = c.get("db");
      const [row] = await db
        .select({ url: link.url, expiresAt: link.expiresAt })
        .from(link)
        .where(eq(link.key, key))
        .limit(1);

      if (!row) {
        return c.notFound();
      }

      record = {
        url: row.url,
        expiresAt: row.expiresAt?.toISOString() ?? null,
      };
      await c.env.LINKS_CACHE.put(cacheKey, JSON.stringify(record), {
        expirationTtl: LINKS_CACHE_TTL_SECONDS,
      });
    }

    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return c.notFound();
    }

    logClick(c, key);
    return c.redirect(record.url, 302);
  } finally {
    console.log(`redirect ${key} ${(performance.now() - start).toFixed(1)}ms`);
  }
});
