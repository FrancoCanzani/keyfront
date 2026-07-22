import Bowser from "bowser";

export type ParsedUserAgent = {
  device: "mobile" | "tablet" | "desktop";
  os: string;
  browser: string;
};

export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  if (!userAgent) {
    return { device: "desktop", os: "unknown", browser: "unknown" };
  }

  const { platform, os, browser } = Bowser.parse(userAgent);

  return {
    device:
      platform.type === "mobile" || platform.type === "tablet"
        ? platform.type
        : "desktop",
    os: os.name ?? "unknown",
    browser: browser.name ?? "unknown",
  };
}
