import { redis } from "./redis";

// shapes read by apps/gateway/internal/proxy/resolve.go — keep in lockstep;
// failures log instead of throw (PG already committed, `bun run sync` heals)

type RouteInput = {
  id: string;
  organizationId: string;
  hostKey: string;
  originUrl: string;
};

type PlanInput = {
  id: string;
  rps: number;
  burst: number;
  monthlyQuota: number | null;
};

type KeyInput = {
  keyHash: string;
  keyId: string;
  serviceId: string;
  planId: string;
  prefix: string;
  expiresAt: Date | null;
};

function safe(op: string, promise: Promise<unknown>) {
  return promise.then(
    () => undefined,
    (error) => console.error(`[sync] ${op}:`, error),
  );
}

export function syncRoute(service: RouteInput) {
  return safe(
    `route:${service.hostKey}`,
    redis.set(
      `route:${service.hostKey}`,
      JSON.stringify({
        serviceId: service.id,
        organizationId: service.organizationId,
        originUrl: service.originUrl,
      }),
    ),
  );
}

export function syncPlan(plan: PlanInput) {
  return safe(
    `plan:${plan.id}`,
    redis.set(
      `plan:${plan.id}`,
      JSON.stringify({
        rps: plan.rps,
        burst: plan.burst,
        monthlyQuota: plan.monthlyQuota,
      }),
    ),
  );
}

export function syncKey(key: KeyInput) {
  return safe(
    `key:${key.keyHash}`,
    redis.set(
      `key:${key.keyHash}`,
      JSON.stringify({
        keyId: key.keyId,
        serviceId: key.serviceId,
        planId: key.planId,
        prefix: key.prefix,
        expiresAt: key.expiresAt ? key.expiresAt.getTime() : null,
      }),
    ),
  );
}

export function removeKey(keyHash: string) {
  return safe(`del key:${keyHash}`, redis.del(`key:${keyHash}`));
}

export function removePlan(planId: string) {
  return safe(`del plan:${planId}`, redis.del(`plan:${planId}`));
}

export function removeService(input: {
  hostKey: string;
  planIds: string[];
  keyHashes: string[];
}) {
  const keys = [
    `route:${input.hostKey}`,
    ...input.planIds.map((id) => `plan:${id}`),
    ...input.keyHashes.map((hash) => `key:${hash}`),
  ];
  return safe(`del service ${input.hostKey}`, redis.del(...keys));
}
