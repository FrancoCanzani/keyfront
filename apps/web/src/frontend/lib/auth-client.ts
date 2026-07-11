import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import type { Auth } from "../../backend/auth";

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    organizationClient(),
    inferAdditionalFields<Auth>(),
  ],
});
