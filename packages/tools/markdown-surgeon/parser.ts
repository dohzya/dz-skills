import type { Document, Section } from "./types.ts";
import { MdError } from "./types.ts";
import { sectionHash } from "./hash.ts";

const HEADER_REGEX = /^(#{1,6})\s+(.+)$/;
const FRONTMATTER_DELIMITER = "---";

/** Parse a Markdown file into a Document structure */
export async function parseDocument(content: string): Promise<Document> {
  const lines = content.split("\n");
  const sections: Section[] = [];

  // Track occurrences of each (level, normalizedTitle) for unique IDs
  const occurrences = new Map<string, number>();

  // Parse frontmatter
  let frontmatter: string | null = null;
  let frontmatterEndLine = 0;
  let startLine = 0;

  if (lines[0]?.trim() === FRONTMATTER_DELIMITER) {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === FRONTMATTER_DELIMITER) {
        frontmatter = lines.slice(0, i + 1).join("\n");
        frontmatterEndLine = i + 1; // 1-indexed
        startLine = i + 1;
        break;
      }
    }
  }

  // Parse sections (skip content inside code blocks)
  let inCodeBlock = false;
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];

    // Track code block state (``` or ~~~)
    if (line.trim().startsWith("```") || line.trim().startsWith("~~~")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip headers inside code blocks
    if (inCodeBlock) continue;

    const match = line.match(HEADER_REGEX);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      const normalizedKey = `${level}:${title.toLowerCase().trim()}`;

      const occurrence = occurrences.get(normalizedKey) ?? 0;
      occurrences.set(normalizedKey, occurrence + 1);

      const id = await sectionHash(level, title, occurrence);

      sections.push({
        id,
        level,
        title,
        line: i + 1, // 1-indexed
        lineEnd: lines.length, // Will be adjusted below
      });
    }
  }

  // Compute lineEnd for each section (line before next section or EOF)
  for (let i = 0; i < sections.length; i++) {
    const nextSection = sections[i + 1];
    if (nextSection) {
      sections[i].lineEnd = nextSection.line - 1;
    } else {
      // Last section goes to end of file
      // Trim trailing empty lines for lineEnd
      let lastContentLine = lines.length;
      while (
        lastContentLine > sections[i].line &&
        lines[lastContentLine - 1]?.trim() === ""
      ) {
        lastContentLine--;
      }
      sections[i].lineEnd = lastContentLine;
    }
  }

  return { sections, lines, frontmatter, frontmatterEndLine };
}

/** Find a section by ID */
export function findSection(doc: Document, id: string): Section | undefined {
  return doc.sections.find((s) => s.id === id);
}

/** Find the section containing a given line number (1-indexed) */
export function findSectionAtLine(
  doc: Document,
  lineNum: number,
): Section | undefined {
  // Find the last section that starts at or before this line
  for (let i = doc.sections.length - 1; i >= 0; i--) {
    if (doc.sections[i].line <= lineNum) {
      return doc.sections[i];
    }
  }
  return undefined;
}

/**
 * Get the end line for a section based on --deep flag
 * Without --deep: stops at next header (any level)
 * With --deep: stops at next header with level >= current
 */
export function getSectionEndLine(
  doc: Document,
  section: Section,
  deep: boolean,
): number {
  const sectionIndex = doc.sections.findIndex((s) => s.id === section.id);
  if (sectionIndex === -1) {
    throw new MdError("section_not_found", `Section ${section.id} not found`);
  }

  if (!deep) {
    // Stop at very next header
    return section.lineEnd;
  }

  // With --deep, find next header with level >= current
  for (let i = sectionIndex + 1; i < doc.sections.length; i++) {
    if (doc.sections[i].level <= section.level) {
      return doc.sections[i].line - 1;
    }
  }

  // No such header found, go to end of file
  let lastLine = doc.lines.length;
  while (lastLine > section.line && doc.lines[lastLine - 1]?.trim() === "") {
    lastLine--;
  }
  return lastLine;
}

/** Get section content (lines after header until end) */
export function getSectionContent(
  doc: Document,
  section: Section,
  deep: boolean,
): string {
  const endLine = getSectionEndLine(doc, section, deep);
  // Content starts after header line
  const contentLines = doc.lines.slice(section.line, endLine);
  return contentLines.join("\n");
}

/** Serialize document back to string */
export function serializeDocument(doc: Document): string {
  return doc.lines.join("\n");
}

/**
 * Get the raw YAML content from frontmatter (without delimiters)
 */
export function getFrontmatterContent(doc: Document): string {
  if (!doc.frontmatter) {
    return "";
  }
  // Remove leading and trailing ---
  const lines = doc.frontmatter.split("\n");
  // Skip first line (---) and last line (---)
  return lines.slice(1, -1).join("\n");
}

/**
 * Set the frontmatter content (adds delimiters)
 */
export function setFrontmatter(doc: Document, yamlContent: string): void {
  const newFrontmatter = yamlContent.trim()
    ? `---\n${yamlContent.trim()}\n---`
    : null;

  if (doc.frontmatter) {
    // Replace existing frontmatter
    const oldEndLine = doc.frontmatterEndLine;
    const newLines = newFrontmatter ? newFrontmatter.split("\n") : [];
    doc.lines = [...newLines, ...doc.lines.slice(oldEndLine)];
    doc.frontmatter = newFrontmatter;
    doc.frontmatterEndLine = newLines.length;
  } else if (newFrontmatter) {
    // Add new frontmatter at the beginning
    const newLines = newFrontmatter.split("\n");
    doc.lines = [...newLines, "", ...doc.lines];
    doc.frontmatter = newFrontmatter;
    doc.frontmatterEndLine = newLines.length;
  }
}

/** Check if content starts with a markdown header */
export function startsWithHeader(
  content: string,
): { level: number; title: string } | null {
  const firstLine = content.split("\n")[0];
  const match = firstLine?.match(HEADER_REGEX);
  if (match) {
    return { level: match[1].length, title: match[2].trim() };
  }
  return null;
}
