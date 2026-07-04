import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default withMDX({
  outputFileTracingRoot: root,
  turbopack: {
    root,
  },
});
