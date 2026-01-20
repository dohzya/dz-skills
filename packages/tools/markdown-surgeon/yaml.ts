import { parse as parseYaml, stringify as stringifyYaml } from "@std/yaml";

/**
 * Get a nested value from an object using dot notation
 * e.g., "author.name" or "tags.0"
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation
 * Creates intermediate objects/arrays as needed
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];
    const isNextIndex = /^\d+$/.test(nextPart);

    if (!(part in current) || current[part] === null || typeof current[part] !== "object") {
      current[part] = isNextIndex ? [] : {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}

/**
 * Delete a nested value from an object using dot notation
 */
export function deleteNestedValue(obj: Record<string, unknown>, path: string): boolean {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || current[part] === null || typeof current[part] !== "object") {
      return false;
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart in current) {
    delete current[lastPart];
    return true;
  }
  return false;
}

/**
 * Parse YAML frontmatter string (without delimiters) into object
 */
export function parseFrontmatter(yaml: string): Record<string, unknown> {
  if (!yaml.trim()) {
    return {};
  }
  try {
    const result = parseYaml(yaml);
    return (result as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

/**
 * Stringify object to YAML (without delimiters)
 */
export function stringifyFrontmatter(obj: Record<string, unknown>): string {
  if (Object.keys(obj).length === 0) {
    return "";
  }
  return stringifyYaml(obj, { lineWidth: -1 }).trim();
}

/**
 * Format a value for output (minimal, no fluff)
 */
export function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  // For arrays and objects, return YAML
  return stringifyYaml(value, { lineWidth: -1 }).trim();
}
