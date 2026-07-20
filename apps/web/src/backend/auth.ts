import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import type { Database } from "./db";
import * as authSchema from "./db/schema/auth";
import { sendEmail } from "./lib/email";

export function createAuth(db: Database) {
  return betterAuth({
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
        onboardedAt: { type: "date", required: false, input: true },
      },
    },
    plugins: [
      organization({
        sendInvitationEmail: async (data) => {
          const baseUrl =
            process.env.BETTER_AUTH_URL ?? "http://localhost:5173";
          const url = `${baseUrl}/accept-invitation?id=${data.id}`;
          if (process.env.NODE_ENV !== "production") {
            console.log(`[org-invite] ${data.email}: ${url}`);
            return;
          }
          await sendEmail({
            to: data.email,
            subject: `Join ${data.organization.name} on vurl`,
            text: `${data.inviter.user.name || data.inviter.user.email} invited you to join ${data.organization.name}.\n\nAccept: ${url}`,
            html: `<p>${data.inviter.user.name || data.inviter.user.email} invited you to join <strong>${data.organization.name}</strong>.</p><p><a href="${url}">Accept invitation</a></p>`,
          });
        },
      }),
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
            subject: "Sign in to vurl",
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
}

export type Auth = ReturnType<typeof createAuth>;
