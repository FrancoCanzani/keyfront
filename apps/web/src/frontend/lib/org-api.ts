let organizationId: string | null = null;

export function setOrganizationId(id: string | null) {
  organizationId = id;
}

export function getOrganizationId(): string | null {
  return organizationId;
}
