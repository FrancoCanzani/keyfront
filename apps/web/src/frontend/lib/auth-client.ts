import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        position: { type: "string" },
      },
    }),
    magicLinkClient(),
    organizationClient(),
  ],
});

export const { useSession, signOut } = authClient;
