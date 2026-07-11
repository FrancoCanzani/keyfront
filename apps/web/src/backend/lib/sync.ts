import type Redis from "ioredis";

type RouteInput = {
  host: string;
  upstream: string;
  secret: string;
};

type KeyInput = {
  consumerId: string;
  serviceId: string;
  planId: string;
  organizationId: string;
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
      consumer_id: key.consumerId,
      service_id: key.serviceId,
      plan_id: key.planId,
      organization_id: key.organizationId,
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
