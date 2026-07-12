const hostSuffix = process.env.GATEWAY_HOST_SUFFIX ?? "gw.keyfront.com";

export function serviceHost(label: string) {
  return `${label}.${hostSuffix}`;
}
