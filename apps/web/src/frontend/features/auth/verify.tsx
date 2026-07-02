import { useEffect, useState } from "react";
import { getRouteApi, Navigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

const route = getRouteApi("/auth/verify");

export function Verify() {
  const { token } = route.useSearch();
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    authClient.magicLink
      .verify({ query: { token } })
      .then(({ error }) => setStatus(error ? "error" : "ok"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "ok") {
    return <Navigate to="/" />;
  }
  if (status === "error") {
    return <Navigate to="/sign-in" search={{ error: "invalid_link" }} />;
  }
  return (
    <div className="grid min-h-svh place-items-center">
      <p className="text-sm text-muted-foreground">Verifying…</p>
    </div>
  );
}
