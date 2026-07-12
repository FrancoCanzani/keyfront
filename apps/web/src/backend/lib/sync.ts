import type Redis from "ioredis";

type RouteInput = {
  serviceId: string;
  host: string;
  upstream: string;
  secret: string;
};

type KeyInput = {
  id: string;
  organizationId: string;
  identityId: string | null;
  serviceId: string;
  planId: string;
  environment: "live" | "test";
  status: "active" | "revoked";
};

type PlanInput = {
  rateLimit: number;
  burst: number;
  monthlyQuota: number;
};

export function syncRoute(redis: Redis, route: RouteInput) {
  return redis.set(
    `route:${route.host}`,
    JSON.stringify({
      service_id: route.serviceId,
      host: route.host,
      upstream: route.upstream,
      secret: route.secret,
    }),
  );
}

export function deleteRoute(redis: Redis, host: string) {
  return redis.del(`route:${host}`);
}

export function syncKey(redis: Redis, hash: string, key: KeyInput) {
  return redis.set(
    `key:${hash}`,
    JSON.stringify({
      id: key.id,
      organization_id: key.organizationId,
      identity_id: key.identityId,
      service_id: key.serviceId,
      plan_id: key.planId,
      environment: key.environment,
      status: key.status,
    }),
  );
}

export function deleteKey(redis: Redis, hash: string) {
  return redis.del(`key:${hash}`);
}

export function syncPlan(redis: Redis, id: string, plan: PlanInput) {
  return redis.set(
    `plan:${id}`,
    JSON.stringify({
      rate_limit: plan.rateLimit,
      burst: plan.burst,
      monthly_quota: plan.monthlyQuota,
    }),
  );
}

export function deletePlan(redis: Redis, id: string) {
  return redis.del(`plan:${id}`);
}
