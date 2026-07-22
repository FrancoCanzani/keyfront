export type CachedLink = { url: string; expiresAt: string | null };

export const LINKS_CACHE_TTL_SECONDS = 300;

export function linkCacheKey(key: string): string {
  return `link:${key}`;
}
