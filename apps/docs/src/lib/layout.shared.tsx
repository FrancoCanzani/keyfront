import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Keyfront",
    },
    links: [
      {
        text: "Dashboard",
        url: "https://app.keyfront.dev",
        external: true,
      },
    ],
  };
}
