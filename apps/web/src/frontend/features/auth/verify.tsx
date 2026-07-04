import { useEffect, useState } from "react";
import { getRouteApi, Navigate, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import {
  postAuthRedirectTarget,
  redirectToFromCallbackUrl,
} from "@/lib/post-auth-redirect";

const route = getRouteApi("/auth/verify");

export function Verify() {
  const { token, callbackURL } = route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    authClient.magicLink
      .verify({ query: { token } })
      .then(async ({ error }) => {
        if (error) {
          setStatus("error");
          return;
        }
        const session = await authClient.getSession();
        if (!session.data) {
          setStatus("error");
          return;
        }
        setStatus("ok");
        const redirectTo = redirectToFromCallbackUrl(callbackURL);
        navigate(await postAuthRedirectTarget(session.data, redirectTo));
      })
      .catch(() => setStatus("error"));
  }, [token, callbackURL, navigate]);

  if (status === "error") {
    return <Navigate to="/sign-in" search={{ error: "invalid_link" }} />;
  }

  return (
    <div className="grid min-h-svh place-items-center">
      <p className="text-sm text-muted-foreground">Verifying…</p>
    </div>
  );
}
