import type { auth } from "./auth";
import type { Database } from "./db";

type Session = typeof auth.$Infer.Session;

export type AppRouteEnv = {
  Variables: {
    db: Database;
    user: Session["user"] | null;
    session: Session["session"] | null;
    organizationId: string | null;
    organizationRole: string | null;
  };
};
