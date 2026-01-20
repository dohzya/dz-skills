/** Generate a short hash (8 hex chars) for a section identifier */
export async function sectionHash(
  level: number,
  title: string,
  occurrenceIndex: number,
): Promise<string> {
  const input = `${level}:${title.toLowerCase().trim()}:${occurrenceIndex}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex.slice(0, 8);
}

/** Check if a string looks like a valid section ID (8 hex chars) */
export function isValidId(id: string): boolean {
  return /^[0-9a-f]{8}$/i.test(id);
}
