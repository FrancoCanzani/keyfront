import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "./db";
import * as authSchema from "./db/schema/auth";
import { sendEmail } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  databaseHooks: {
    session: {
      create: {
        // Every session gets an active organization; first sign-in creates one.
        before: async (session) => {
          let [membership] = await db
            .select({ organizationId: authSchema.member.organizationId })
            .from(authSchema.member)
            .where(eq(authSchema.member.userId, session.userId))
            .limit(1);

          if (!membership) {
            const [user] = await db
              .select({ email: authSchema.user.email })
              .from(authSchema.user)
              .where(eq(authSchema.user.id, session.userId));
            const organizationId = crypto.randomUUID();
            await db.insert(authSchema.organization).values({
              id: organizationId,
              name: user?.email.split("@")[0] ?? "personal",
              slug: organizationId.slice(0, 8),
              createdAt: new Date(),
            });
            await db.insert(authSchema.member).values({
              id: crypto.randomUUID(),
              organizationId,
              userId: session.userId,
              role: "owner",
              createdAt: new Date(),
            });
            membership = { organizationId };
          }

          return {
            data: {
              ...session,
              activeOrganizationId: membership.organizationId,
            },
          };
        },
      },
    },
  },
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
        if (process.env.NODE_ENV !== "production") {
          console.log(`[magic-link] ${email}: ${clientUrl}`);
          return;
        }
        await sendEmail({
          to: email,
          subject: "Sign in to api-gateway",
          text: `Sign in: ${clientUrl}\n\nThis link can only be used once. If you didn't request it, ignore this email.`,
          html: `<p><a href="${clientUrl}">Click here to sign in</a></p><p>This link can only be used once. If you didn't request it, ignore this email.</p>`,
        });
      },
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
  trustedOrigins: ["http://localhost:5173"],
});
