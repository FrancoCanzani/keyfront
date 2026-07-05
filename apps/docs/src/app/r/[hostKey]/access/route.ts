import { fetchReference } from "@/lib/reference";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ hostKey: string }> },
) {
  const { hostKey } = await ctx.params;
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }
  const reference = await fetchReference(hostKey, token);
  if (!reference) {
    return new Response("Invalid or expired link", { status: 401 });
  }

  const response = NextResponse.redirect(new URL(`/r/${hostKey}`, request.url));
  response.cookies.set(`kf_ref_${hostKey}`, token, {
    httpOnly: true,
    sameSite: "lax",
    path: `/r/${hostKey}`,
    maxAge: 30 * 60,
  });
  return response;
}
