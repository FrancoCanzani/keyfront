import type { Metadata } from "next";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.keyfront.dev"),
  title: {
    default: "Keyfront documentation",
    template: "%s | Keyfront",
  },
  description: "Put your API behind Keyfront for keys, limits, usage, and billing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
