import { createHash } from "node:crypto";
import { upgrade } from "@scalar/openapi-parser";
import YAML from "yaml";

export const MAX_SPEC_BYTES = 5 * 1024 * 1024;

const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

type OperationObject = {
  operationId?: string;
  summary?: string;
  tags?: string[];
  deprecated?: boolean;
};

type OpenAPIDocument = {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string };
  servers?: { url?: string }[];
  paths?: Record<string, Record<string, unknown>>;
};

export class SpecError extends Error {}

export type ExtractedOperation = {
  operationId: string;
  method: string;
  pathTemplate: string;
  segments: string[];
  summary: string | null;
  tags: string[] | null;
  deprecated: boolean;
};

export type IngestedSpec = {
  document: OpenAPIDocument;
  sourceHash: string;
  openapiVersion: string;
  title: string | null;
  specVersion: string | null;
  warnings: string[];
  operations: ExtractedOperation[];
};

export function pathSegments(pathTemplate: string) {
  return pathTemplate
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment.startsWith("{") && segment.endsWith("}") ? "{}" : segment,
    );
}

function synthesizeOperationId(method: string, pathTemplate: string) {
  const slug = pathTemplate
    .replace(/[{}]/g, "")
    .split("/")
    .filter(Boolean)
    .join("_")
    .replace(/[^a-zA-Z0-9_]/g, "_");
  return `${method}_${slug || "root"}`;
}

function extractOperations(document: OpenAPIDocument) {
  const operations: ExtractedOperation[] = [];
  const seen = new Set<string>();
  for (const [pathTemplate, item] of Object.entries(document.paths ?? {})) {
    if (!pathTemplate.startsWith("/") || item == null) continue;
    for (const method of HTTP_METHODS) {
      const raw = item[method];
      if (raw == null || typeof raw !== "object") continue;
      const dedupe = `${method} ${pathTemplate}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      const operation = raw as OperationObject;
      operations.push({
        operationId:
          operation.operationId ?? synthesizeOperationId(method, pathTemplate),
        method: method.toUpperCase(),
        pathTemplate,
        segments: pathSegments(pathTemplate),
        summary: operation.summary ?? null,
        tags: Array.isArray(operation.tags) ? operation.tags : null,
        deprecated: operation.deprecated === true,
      });
    }
  }
  return operations;
}

export async function ingestSpec(raw: string): Promise<IngestedSpec> {
  if (raw.length > MAX_SPEC_BYTES) {
    throw new SpecError("Spec exceeds the 5 MB limit");
  }

  let parsed: unknown;
  try {
    parsed = raw.trimStart().startsWith("{") ? JSON.parse(raw) : YAML.parse(raw);
  } catch {
    throw new SpecError("Not valid JSON or YAML");
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SpecError("Expected an OpenAPI document object");
  }

  const input = parsed as OpenAPIDocument;
  if (!input.openapi && !input.swagger) {
    throw new SpecError("Missing openapi/swagger version field");
  }

  let document = input;
  if (input.swagger) {
    try {
      document = upgrade(structuredClone(input)).specification as OpenAPIDocument;
    } catch {
      throw new SpecError("Failed to upgrade Swagger 2.0 document");
    }
  }

  if (
    document.paths == null ||
    typeof document.paths !== "object" ||
    Object.keys(document.paths).length === 0
  ) {
    throw new SpecError("Document has no paths");
  }

  const operations = extractOperations(document);
  return {
    document,
    sourceHash: createHash("sha256").update(raw).digest("hex"),
    openapiVersion: document.openapi ?? "3.0.0",
    title: document.info?.title ?? null,
    specVersion: document.info?.version ?? null,
    warnings: lintDocument(document, operations),
    operations,
  };
}

// Ajv-based spec validation compiles code with `new Function`, which workerd
// forbids — so warnings come from these structural checks instead
function lintDocument(
  document: OpenAPIDocument,
  operations: ExtractedOperation[],
) {
  const warnings: string[] = [];
  const push = (warning: string) => {
    if (warnings.length < 25) warnings.push(warning);
  };

  if (!document.info?.title) push("info.title is missing");
  if (!document.info?.version) push("info.version is missing");

  for (const pathTemplate of Object.keys(document.paths ?? {})) {
    if (!pathTemplate.startsWith("/") && !pathTemplate.startsWith("x-")) {
      push(`Path "${pathTemplate}" does not start with "/"`);
    }
    const open = (pathTemplate.match(/\{/g) ?? []).length;
    const close = (pathTemplate.match(/\}/g) ?? []).length;
    if (open !== close) {
      push(`Path "${pathTemplate}" has unbalanced braces`);
    }
  }

  const seen = new Map<string, string>();
  for (const operation of operations) {
    const where = `${operation.method} ${operation.pathTemplate}`;
    const existing = seen.get(operation.operationId);
    if (existing) {
      push(
        `Duplicate operationId "${operation.operationId}" (${existing} and ${where})`,
      );
    } else {
      seen.set(operation.operationId, where);
    }
    if (!operation.summary) push(`${where} has no summary`);
  }

  return warnings;
}

type MatchableOperation = {
  id: string;
  method: string;
  segments: string[];
};

export function createOperationMatcher(operations: MatchableOperation[]) {
  const buckets = new Map<string, MatchableOperation[]>();
  for (const operation of operations) {
    const bucket = `${operation.method} ${operation.segments.length}`;
    const list = buckets.get(bucket);
    if (list) list.push(operation);
    else buckets.set(bucket, [operation]);
  }

  return (method: string, path: string): string | null => {
    const clean = path.split("?")[0];
    const segments = clean.split("/").filter(Boolean);
    const candidates = buckets.get(`${method.toUpperCase()} ${segments.length}`);
    if (!candidates) return null;

    let best: MatchableOperation | null = null;
    let bestLiterals = -1;
    for (const candidate of candidates) {
      let literals = 0;
      let matches = true;
      for (let i = 0; i < segments.length; i++) {
        const expected = candidate.segments[i];
        if (expected === "{}") continue;
        if (expected !== segments[i]) {
          matches = false;
          break;
        }
        literals++;
      }
      if (matches && literals > bestLiterals) {
        best = candidate;
        bestLiterals = literals;
      }
    }
    return best?.id ?? null;
  };
}
