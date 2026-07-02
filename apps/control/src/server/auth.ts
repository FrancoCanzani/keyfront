import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, organization } from "better-auth/plugins";
import { db } from "./db";
import * as authSchema from "./db/schema/auth";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  user: {
    additionalFields: {
      firstName: { type: "string", required: false, input: true },
      lastName: { type: "string", required: false, input: true },
      position: { type: "string", required: false, input: true },
    },
  },
  plugins: [
    organization(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const clientUrl = url.replace(
          "/api/auth/magic-link/verify",
          "/auth/verify",
        );
        console.log(`[magic-link] ${email}: ${clientUrl}`);
      },
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
  trustedOrigins: ["http://localhost:5173"],
});
