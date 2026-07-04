type StandardIssue = { message?: string };

function isIssue(value: unknown): value is StandardIssue {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  );
}

export function firstFormError(errorMap: unknown): string | null {
  if (!errorMap) return null;
  if (Array.isArray(errorMap)) {
    const issue = errorMap.find(isIssue);
    return issue?.message ?? null;
  }
  if (typeof errorMap !== "object") return null;
  for (const value of Object.values(errorMap)) {
    if (isIssue(value)) return value.message ?? null;
    if (Array.isArray(value)) {
      const issue = value.find(isIssue);
      if (issue?.message) return issue.message;
    }
    if (value && typeof value === "object") {
      const nested = firstFormError(value);
      if (nested) return nested;
    }
  }
  return null;
}
