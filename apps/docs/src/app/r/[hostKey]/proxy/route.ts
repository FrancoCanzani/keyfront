import { createOpenAPI } from "fumadocs-openapi/server";
import { cookies } from "next/headers";

const { createProxy } = createOpenAPI();

function gatewayOrigin(hostKey: string) {
  const domain = process.env.GATEWAY_DOMAIN ?? "localhost:8080";
  const scheme = domain.includes("localhost") ? "http" : "https";
  return `${scheme}://${hostKey}.${domain}`;
}

async function handle(
  request: Request,
  ctx: { params: Promise<{ hostKey: string }> },
) {
  const { hostKey } = await ctx.params;
  const authorized = (await cookies()).has(`kf_ref_${hostKey}`);
  if (!authorized) {
    return new Response("Unauthorized", { status: 401 });
  }
  const proxy = createProxy({ allowedOrigins: [gatewayOrigin(hostKey)] });
  return proxy.handle(request);
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as DELETE,
  handle as PATCH,
  handle as HEAD,
};
