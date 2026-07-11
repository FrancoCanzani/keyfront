import { service } from "../../../db/schema/service";

export const serviceColumns = {
  id: service.id,
  organizationId: service.organizationId,
  name: service.name,
  host: service.host,
  upstream: service.upstream,
  defaultPlanId: service.defaultPlanId,
  createdAt: service.createdAt,
  updatedAt: service.updatedAt,
};
