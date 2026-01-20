/**
 * Magic expressions expansion
 *
 * Supported:
 * - {datetime} or {dt} → ISO 8601 with local TZ (2024-01-15T14:30:00+01:00)
 * - {datetime:short} or {dt:short} → short format (2024-01-15 14:30)
 * - {date} → just date (2024-01-15)
 * - {time} → just time (14:30:00)
 * - {meta:key} → value from frontmatter (supports nested: {meta:author.name})
 */

import { getNestedValue, formatValue } from "./yaml.ts";

/**
 * Get current datetime in ISO format with local timezone
 */
function getLocalISOString(): string {
  const now = new Date();
  const tzOffset = -now.getTimezoneOffset();
  const sign = tzOffset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(tzOffset) % 60).padStart(2, "0");

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${hours}:${minutes}`;
}

/**
 * Get current date (YYYY-MM-DD)
 */
function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get current time (HH:MM:SS)
 */
function getLocalTime(): string {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  return `${hour}:${minute}:${second}`;
}

/**
 * Get short datetime (YYYY-MM-DD HH:mm)
 */
function getShortDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * Expand magic expressions in a string
 *
 * @param input The string containing magic expressions
 * @param meta Optional frontmatter object for {meta:key} expansion
 * @returns The expanded string
 */
export function expandMagic(input: string, meta?: Record<string, unknown>): string {
  return input.replace(/\{([^}]+)\}/g, (match, expr: string) => {
    const trimmed = expr.trim();

    if (trimmed === "datetime" || trimmed === "dt") {
      return getLocalISOString();
    }

    if (trimmed === "datetime:short" || trimmed === "dt:short") {
      return getShortDateTime();
    }

    if (trimmed === "date") {
      return getLocalDate();
    }

    if (trimmed === "time") {
      return getLocalTime();
    }

    if (trimmed.startsWith("meta:") && meta) {
      const key = trimmed.slice(5); // Remove "meta:" prefix
      const value = getNestedValue(meta, key);
      if (value !== undefined && value !== null) {
        return formatValue(value);
      }
      return ""; // Return empty string if key not found
    }

    // Unknown expression, leave as-is
    return match;
  });
}
