import {
  type Document,
  MdError,
  type MutationResult,
  type SearchMatch,
  type SearchSummary,
  type Section,
} from "./types.ts";
import {
  findSection,
  findSectionAtLine,
  getFrontmatterContent,
  getSectionContent,
  getSectionEndLine,
  parseDocument,
  serializeDocument,
  setFrontmatter,
  startsWithHeader,
} from "./parser.ts";
import { isValidId } from "./hash.ts";
import {
  deleteNestedValue,
  formatValue,
  getNestedValue,
  parseFrontmatter,
  setNestedValue,
  stringifyFrontmatter,
} from "./yaml.ts";
import { expandMagic } from "./magic.ts";

// ============================================================================
// Version
// ============================================================================

const VERSION = "0.4.0";

// ============================================================================
// Output formatters (text)
// ============================================================================

function formatOutline(doc: Document): string {
  return doc.sections
    .map((s) => `${"#".repeat(s.level)} ${s.title} ^${s.id} L${s.line}`)
    .join("\n");
}

function formatRead(
  section: Section,
  content: string,
  endLine: number,
): string {
  const header = `${
    "#".repeat(section.level)
  } ${section.title} ^${section.id} L${section.line}-L${endLine}`;
  if (content.trim() === "") {
    return header;
  }
  return `${header}\n\n${content}`;
}

function formatMutation(result: MutationResult): string {
  const range = result.lineEnd
    ? `L${result.lineStart}-L${result.lineEnd}`
    : `L${result.lineStart}`;
  const delta = [];
  if (result.linesAdded > 0) delta.push(`+${result.linesAdded}`);
  if (result.linesRemoved > 0) delta.push(`-${result.linesRemoved}`);
  const deltaStr = delta.length > 0 ? ` (${delta.join(", ")})` : "";
  return `${result.action} ^${result.id} ${range}${deltaStr}`;
}

function formatSearchMatches(matches: SearchMatch[]): string {
  return matches
    .map((m) => {
      const sectionPart = m.sectionId ? `^${m.sectionId}` : "^-";
      return `${sectionPart} L${m.line} ${m.content}`;
    })
    .join("\n");
}

function formatSearchSummary(summaries: SearchSummary[]): string {
  return summaries
    .map((s) => {
      const header = `${"#".repeat(s.level)} ${s.title}`;
      const lines = s.lines.map((l) => `L${l}`).join(",");
      const matchWord = s.matchCount === 1 ? "match" : "matches";
      return `${header} ^${s.id} ${lines} (${s.matchCount} ${matchWord})`;
    })
    .join("\n");
}

// ============================================================================
// Output formatters (JSON)
// ============================================================================

function jsonOutline(doc: Document): string {
  return JSON.stringify(
    doc.sections.map((s) => ({
      id: s.id,
      level: s.level,
      title: s.title,
      line: s.line,
    })),
  );
}

function jsonRead(section: Section, content: string, endLine: number): string {
  return JSON.stringify({
    id: section.id,
    level: section.level,
    title: section.title,
    lineStart: section.line,
    lineEnd: endLine,
    content,
  });
}

function jsonMutation(result: MutationResult): string {
  return JSON.stringify(result);
}

function jsonSearchMatches(matches: SearchMatch[]): string {
  return JSON.stringify(matches);
}

function jsonSearchSummary(summaries: SearchSummary[]): string {
  return JSON.stringify(summaries);
}

// ============================================================================
// File I/O
// ============================================================================

async function readFile(path: string): Promise<string> {
  try {
    return await Deno.readTextFile(path);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new MdError("file_not_found", `File not found: ${path}`, path);
    }
    throw new MdError("io_error", `Failed to read file: ${path}`, path);
  }
}

async function writeFile(path: string, content: string): Promise<void> {
  try {
    await Deno.writeTextFile(path, content);
  } catch {
    throw new MdError("io_error", `Failed to write file: ${path}`, path);
  }
}

async function readStdin(): Promise<string> {
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  for await (const chunk of Deno.stdin.readable) {
    chunks.push(chunk);
  }
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return decoder.decode(combined);
}

// ============================================================================
// Commands
// ============================================================================

async function cmdOutline(
  file: string,
  afterId: string | null,
  last: boolean,
  count: boolean,
  json: boolean,
): Promise<string> {
  const content = await readFile(file);
  const doc = await parseDocument(content);

  let sections = doc.sections;

  // Filter to subsections after a given section ID
  if (afterId) {
    if (!isValidId(afterId)) {
      throw new MdError(
        "invalid_id",
        `Invalid section ID: ${afterId}`,
        file,
        afterId,
      );
    }
    const parentSection = findSection(doc, afterId);
    if (!parentSection) {
      throw new MdError(
        "section_not_found",
        `No section with id '${afterId}' in ${file}`,
        file,
        afterId,
      );
    }

    // Get subsections: sections with level > parent and within parent's range
    const parentEndLine = getSectionEndLine(doc, parentSection, true);
    sections = doc.sections.filter(
      (s) =>
        s.line > parentSection.line && s.line <= parentEndLine &&
        s.level > parentSection.level,
    );
  }

  // Return count only
  if (count) {
    return json
      ? JSON.stringify({ count: sections.length })
      : String(sections.length);
  }

  // Return last section only
  if (last) {
    if (sections.length === 0) {
      return json ? "null" : "";
    }
    const lastSection = sections[sections.length - 1];
    if (json) {
      return JSON.stringify({
        id: lastSection.id,
        level: lastSection.level,
        title: lastSection.title,
        line: lastSection.line,
      });
    }
    return `${
      "#".repeat(lastSection.level)
    } ${lastSection.title} ^${lastSection.id} L${lastSection.line}`;
  }

  return json
    ? jsonOutline({ ...doc, sections })
    : formatOutline({ ...doc, sections });
}

async function cmdRead(
  file: string,
  id: string,
  deep: boolean,
  json: boolean,
): Promise<string> {
  if (!isValidId(id)) {
    throw new MdError("invalid_id", `Invalid section ID: ${id}`, file, id);
  }

  const content = await readFile(file);
  const doc = await parseDocument(content);
  const section = findSection(doc, id);

  if (!section) {
    throw new MdError(
      "section_not_found",
      `No section with id '${id}' in ${file}`,
      file,
      id,
    );
  }

  const endLine = getSectionEndLine(doc, section, deep);
  const sectionContent = getSectionContent(doc, section, deep);
  return json
    ? jsonRead(section, sectionContent, endLine)
    : formatRead(section, sectionContent, endLine);
}

async function cmdWrite(
  file: string,
  id: string,
  newContent: string,
  deep: boolean,
  json: boolean,
): Promise<string> {
  if (!isValidId(id)) {
    throw new MdError("invalid_id", `Invalid section ID: ${id}`, file, id);
  }

  const fileContent = await readFile(file);
  const doc = await parseDocument(fileContent);
  const section = findSection(doc, id);

  if (!section) {
    throw new MdError(
      "section_not_found",
      `No section with id '${id}' in ${file}`,
      file,
      id,
    );
  }

  // Expand magic expressions
  const meta = parseFrontmatter(getFrontmatterContent(doc));
  const expandedContent = expandMagic(newContent, meta);

  const endLine = getSectionEndLine(doc, section, deep);
  const oldLineCount = endLine - section.line; // Lines after header

  // Prepare new content lines
  const newLines = expandedContent === "" ? [] : expandedContent.split("\n");
  // Ensure content doesn't start right after header - add blank line if needed
  if (newLines.length > 0 && newLines[0].trim() !== "") {
    newLines.unshift("");
  }

  // Replace lines: keep header (section.line - 1 in 0-indexed), replace rest
  const beforeSection = doc.lines.slice(0, section.line); // includes header
  const afterSection = doc.lines.slice(endLine);

  doc.lines = [...beforeSection, ...newLines, ...afterSection];

  await writeFile(file, serializeDocument(doc));

  const result: MutationResult = {
    action: "updated",
    id: section.id,
    lineStart: section.line,
    lineEnd: section.line + newLines.length,
    linesAdded: newLines.length,
    linesRemoved: oldLineCount,
  };

  return json ? jsonMutation(result) : formatMutation(result);
}

async function cmdAppend(
  file: string,
  id: string | null,
  newContent: string,
  deep: boolean,
  before: boolean,
  json: boolean,
): Promise<string> {
  const fileContent = await readFile(file);
  const doc = await parseDocument(fileContent);

  // Expand magic expressions
  const meta = parseFrontmatter(getFrontmatterContent(doc));
  const expandedContent = expandMagic(newContent, meta);

  const newLines = expandedContent.split("\n");
  let insertLine: number;
  let section: Section | null = null;

  if (id === null) {
    // No ID: append to file start (--before) or end (default/--after)
    if (before) {
      // Insert after frontmatter if present
      insertLine = doc.frontmatterEndLine;
    } else {
      // Insert at end of file
      insertLine = doc.lines.length;
    }
  } else {
    // With ID: append relative to section
    if (!isValidId(id)) {
      throw new MdError("invalid_id", `Invalid section ID: ${id}`, file, id);
    }

    const found = findSection(doc, id);

    if (!found) {
      throw new MdError(
        "section_not_found",
        `No section with id '${id}' in ${file}`,
        file,
        id,
      );
    }
    section = found;

    if (before) {
      // Insert before the section's header
      insertLine = section.line - 1; // 0-indexed, before header
    } else {
      // Insert at end of section (or after subsections with --deep)
      const endLine = getSectionEndLine(doc, section, deep);
      insertLine = endLine; // 0-indexed position to insert
    }
  }

  // Add blank line before if inserting after content and content doesn't start with blank
  if (
    !before && insertLine > 0 && doc.lines[insertLine - 1]?.trim() !== "" &&
    newLines[0]?.trim() !== ""
  ) {
    newLines.unshift("");
  }

  // Insert the new lines
  doc.lines.splice(insertLine, 0, ...newLines);

  await writeFile(file, serializeDocument(doc));

  // Determine if we created a new section
  const headerInfo = startsWithHeader(expandedContent);
  const action = headerInfo ? "created" : "appended";

  // For created, compute the new section's ID
  let resultId = section?.id ?? "-";
  if (headerInfo) {
    // Re-parse to get the new section's ID
    const newDoc = await parseDocument(serializeDocument(doc));
    const newSection = newDoc.sections.find(
      (s) => s.line === insertLine + 1 && s.title === headerInfo.title,
    );
    if (newSection) {
      resultId = newSection.id;
    }
  }

  const result: MutationResult = {
    action,
    id: resultId,
    lineStart: insertLine + 1, // 1-indexed
    lineEnd: headerInfo ? insertLine + newLines.length : undefined,
    linesAdded: newLines.length,
    linesRemoved: 0,
  };

  return json ? jsonMutation(result) : formatMutation(result);
}

async function cmdEmpty(
  file: string,
  id: string,
  deep: boolean,
  json: boolean,
): Promise<string> {
  if (!isValidId(id)) {
    throw new MdError("invalid_id", `Invalid section ID: ${id}`, file, id);
  }

  const fileContent = await readFile(file);
  const doc = await parseDocument(fileContent);
  const section = findSection(doc, id);

  if (!section) {
    throw new MdError(
      "section_not_found",
      `No section with id '${id}' in ${file}`,
      file,
      id,
    );
  }

  const endLine = getSectionEndLine(doc, section, deep);
  const linesRemoved = endLine - section.line;

  // Keep header, remove content
  const beforeContent = doc.lines.slice(0, section.line); // includes header
  const afterContent = doc.lines.slice(endLine);

  doc.lines = [...beforeContent, ...afterContent];

  await writeFile(file, serializeDocument(doc));

  const result: MutationResult = {
    action: "emptied",
    id: section.id,
    lineStart: section.line,
    linesAdded: 0,
    linesRemoved,
  };

  return json ? jsonMutation(result) : formatMutation(result);
}

async function cmdRemove(
  file: string,
  id: string,
  json: boolean,
): Promise<string> {
  if (!isValidId(id)) {
    throw new MdError("invalid_id", `Invalid section ID: ${id}`, file, id);
  }

  const fileContent = await readFile(file);
  const doc = await parseDocument(fileContent);
  const section = findSection(doc, id);

  if (!section) {
    throw new MdError(
      "section_not_found",
      `No section with id '${id}' in ${file}`,
      file,
      id,
    );
  }

  // Remove always includes subsections (deep behavior)
  const endLine = getSectionEndLine(doc, section, true);
  const linesRemoved = endLine - section.line + 1; // +1 for header

  const beforeSection = doc.lines.slice(0, section.line - 1); // before header
  const afterSection = doc.lines.slice(endLine);

  doc.lines = [...beforeSection, ...afterSection];

  await writeFile(file, serializeDocument(doc));

  const result: MutationResult = {
    action: "removed",
    id: section.id,
    lineStart: section.line,
    linesAdded: 0,
    linesRemoved,
  };

  return json ? jsonMutation(result) : formatMutation(result);
}

async function cmdSearch(
  file: string,
  pattern: string,
  summary: boolean,
  json: boolean,
): Promise<string> {
  const content = await readFile(file);
  const doc = await parseDocument(content);

  const matches: SearchMatch[] = [];

  for (let i = 0; i < doc.lines.length; i++) {
    const line = doc.lines[i];
    if (line.includes(pattern)) {
      const lineNum = i + 1; // 1-indexed
      const section = findSectionAtLine(doc, lineNum);
      matches.push({
        sectionId: section?.id ?? null,
        line: lineNum,
        content: line,
      });
    }
  }

  if (!summary) {
    return json ? jsonSearchMatches(matches) : formatSearchMatches(matches);
  }

  // Group by section
  const sectionMap = new Map<string, SearchSummary>();

  for (const match of matches) {
    if (!match.sectionId) continue;

    const section = findSection(doc, match.sectionId);
    if (!section) continue;

    let entry = sectionMap.get(match.sectionId);
    if (!entry) {
      entry = {
        id: section.id,
        level: section.level,
        title: section.title,
        lines: [],
        matchCount: 0,
      };
      sectionMap.set(match.sectionId, entry);
    }
    entry.lines.push(match.line);
    entry.matchCount++;
  }

  const summaries = Array.from(sectionMap.values());
  return json ? jsonSearchSummary(summaries) : formatSearchSummary(summaries);
}

async function cmdMeta(
  file: string,
  key: string | null,
  value: string | null,
  del: boolean,
  getH1: boolean,
): Promise<string> {
  const fileContent = await readFile(file);
  const doc = await parseDocument(fileContent);

  // Get h1 title
  if (getH1) {
    const h1 = doc.sections.find((s) => s.level === 1);
    return h1 ? h1.title : "";
  }

  const yamlContent = getFrontmatterContent(doc);
  const meta = parseFrontmatter(yamlContent);

  // Delete mode
  if (del) {
    if (!key) {
      throw new MdError("parse_error", "Usage: md meta <file> --del <key>");
    }
    const deleted = deleteNestedValue(meta, key);
    if (!deleted) {
      throw new MdError("parse_error", `Key '${key}' not found`);
    }
    setFrontmatter(doc, stringifyFrontmatter(meta));
    await writeFile(file, serializeDocument(doc));
    return `deleted ${key}`;
  }

  // Set mode
  if (value !== null) {
    if (!key) {
      throw new MdError(
        "parse_error",
        "Usage: md meta <file> --set <key> <value>",
      );
    }
    // Expand magic expressions
    const expandedValue = expandMagic(value, meta);
    // Try to parse value as YAML (for arrays, objects, numbers, booleans)
    let parsedValue: unknown = expandedValue;
    try {
      const parsed = parseFrontmatter(expandedValue);
      // If it parsed to something other than empty object, use it
      if (typeof parsed !== "object" || Object.keys(parsed).length > 0) {
        parsedValue = parsed;
      }
    } catch {
      // Keep as string
    }
    // But if it looks like a simple string, keep it as string
    if (
      typeof parsedValue === "object" &&
      Object.keys(parsedValue as object).length === 0
    ) {
      parsedValue = expandedValue;
    }
    setNestedValue(meta, key, parsedValue);
    setFrontmatter(doc, stringifyFrontmatter(meta));
    await writeFile(file, serializeDocument(doc));
    return `set ${key}`;
  }

  // Get mode
  if (key) {
    const val = getNestedValue(meta, key);
    return formatValue(val);
  }

  // Show all
  return yamlContent;
}

async function cmdCreate(
  file: string,
  title: string | null,
  metaEntries: Array<[string, string]>,
  force: boolean,
  content: string | null,
): Promise<string> {
  // Check if file exists
  let fileExists = false;
  try {
    await Deno.stat(file);
    fileExists = true;
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      throw new MdError("io_error", `Failed to check file: ${file}`, file);
    }
  }

  if (fileExists && !force) {
    throw new MdError(
      "io_error",
      `File already exists: ${file}. Use --force to overwrite.`,
      file,
    );
  }

  const lines: string[] = [];

  // Build frontmatter if any meta entries (expand magic expressions)
  const meta: Record<string, unknown> = {};
  if (metaEntries.length > 0) {
    for (const [key, value] of metaEntries) {
      const expandedValue = expandMagic(value, meta); // meta grows as we add entries
      setNestedValue(meta, key, expandedValue);
    }
    const yaml = stringifyFrontmatter(meta);
    lines.push("---", yaml, "---", "");
  }

  // Add title if provided (expand magic expressions)
  if (title) {
    const expandedTitle = expandMagic(title, meta);
    lines.push(`# ${expandedTitle}`, "");
  }

  // Add initial content if provided (expand magic expressions)
  if (content) {
    const expandedContent = expandMagic(content, meta);
    lines.push(expandedContent);
  }

  await writeFile(file, lines.join("\n"));
  return `created ${file}`;
}

async function cmdConcat(files: string[], shift: number): Promise<string> {
  const outputs: string[] = [];
  let firstFrontmatter: string | null = null;

  for (let i = 0; i < files.length; i++) {
    const content = await readFile(files[i]);
    const doc = await parseDocument(content);

    // Keep first file's frontmatter
    if (i === 0 && doc.frontmatter) {
      firstFrontmatter = doc.frontmatter;
    }

    // Get content without frontmatter
    const startLine = doc.frontmatterEndLine;
    let fileLines = doc.lines.slice(startLine);

    // Shift headers
    if (shift > 0) {
      fileLines = fileLines.map((line) => {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          const newLevel = Math.min(6, match[1].length + shift);
          return "#".repeat(newLevel) + " " + match[2];
        }
        return line;
      });
    }

    outputs.push(fileLines.join("\n"));
  }

  let result = outputs.join("\n\n");
  if (firstFrontmatter) {
    result = firstFrontmatter + "\n\n" + result;
  }

  return result;
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
  console.log(`Usage: md <command> [options]

Commands:
  outline <file> [--after ID] [--last] [--count]  List sections
  read [--deep] <file> <id>              Read section content
  write [--deep] <file> <id> [content]   Update section content
  append [--deep] [--before] <file> <id> [content]  Append to section
  empty [--deep] <file> <id>             Empty section
  remove <file> <id>                     Remove section + subsections
  search [--summary] <file> <pattern>    Search in file
  concat [--shift[=N]] <files...>        Concatenate files
  meta <file> [key]                      Show frontmatter or get key
  meta <file> --set <key> <value>        Set frontmatter key
  meta <file> --del <key>                Delete frontmatter key
  create <file> [--title T] [--meta k=v] Create new file`);
}

function parseArgs(args: string[]): {
  command: string;
  flags: {
    deep: boolean;
    before: boolean;
    summary: boolean;
    shift: number;
    set: boolean;
    del: boolean;
    title: string | null;
    meta: Array<[string, string]>;
    force: boolean;
    after: string | null;
    last: boolean;
    count: boolean;
    h1: boolean;
    json: boolean;
  };
  positional: string[];
} {
  const flags = {
    deep: false,
    before: false,
    summary: false,
    shift: 0,
    set: false,
    del: false,
    title: null as string | null,
    meta: [] as Array<[string, string]>,
    force: false,
    after: null as string | null,
    last: false,
    count: false,
    h1: false,
    json: false,
  };
  const positional: string[] = [];
  let command = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--deep") {
      flags.deep = true;
    } else if (arg === "--before") {
      flags.before = true;
    } else if (arg === "--summary") {
      flags.summary = true;
    } else if (arg === "--shift") {
      flags.shift = 1;
    } else if (arg.startsWith("--shift=")) {
      flags.shift = parseInt(arg.slice(8), 10) || 1;
    } else if (arg === "--set") {
      flags.set = true;
    } else if (arg === "--del" || arg === "--delete") {
      flags.del = true;
    } else if (arg === "--title" && i + 1 < args.length) {
      flags.title = args[++i];
    } else if (arg.startsWith("--title=")) {
      flags.title = arg.slice(8);
    } else if (arg === "--meta" && i + 1 < args.length) {
      const kv = args[++i];
      const eqIdx = kv.indexOf("=");
      if (eqIdx > 0) {
        flags.meta.push([kv.slice(0, eqIdx), kv.slice(eqIdx + 1)]);
      }
    } else if (arg.startsWith("--meta=")) {
      const kv = arg.slice(7);
      const eqIdx = kv.indexOf("=");
      if (eqIdx > 0) {
        flags.meta.push([kv.slice(0, eqIdx), kv.slice(eqIdx + 1)]);
      }
    } else if (arg === "--force") {
      flags.force = true;
    } else if (arg === "--after" && i + 1 < args.length) {
      flags.after = args[++i];
    } else if (arg.startsWith("--after=")) {
      flags.after = arg.slice(8);
    } else if (arg === "--last") {
      flags.last = true;
    } else if (arg === "--count") {
      flags.count = true;
    } else if (arg === "--h1") {
      flags.h1 = true;
    } else if (arg === "--format=json" || arg === "--json") {
      flags.json = true;
    } else if (!command) {
      command = arg;
    } else {
      positional.push(arg);
    }
  }

  return { command, flags, positional };
}

export async function main(args: string[]): Promise<void> {
  // Handle version flag
  if (args.length === 1 && (args[0] === "-v" || args[0] === "--version")) {
    console.log(VERSION);
    Deno.exit(0);
  }

  if (args.length === 0) {
    printUsage();
    Deno.exit(0);
  }

  const { command, flags, positional } = parseArgs(args);

  try {
    let output: string;

    switch (command) {
      case "outline": {
        if (positional.length < 1) {
          throw new MdError(
            "parse_error",
            "Usage: md outline <file> [--after ID] [--last] [--count]",
          );
        }
        output = await cmdOutline(
          positional[0],
          flags.after,
          flags.last,
          flags.count,
          flags.json,
        );
        break;
      }

      case "read": {
        if (positional.length < 2) {
          throw new MdError(
            "parse_error",
            "Usage: md read [--deep] <file> <id>",
          );
        }
        output = await cmdRead(
          positional[0],
          positional[1],
          flags.deep,
          flags.json,
        );
        break;
      }

      case "write": {
        if (positional.length < 2) {
          throw new MdError(
            "parse_error",
            "Usage: md write [--deep] <file> <id> [content]",
          );
        }
        const content = positional[2] ?? await readStdin();
        output = await cmdWrite(
          positional[0],
          positional[1],
          content,
          flags.deep,
          flags.json,
        );
        break;
      }

      case "append": {
        if (positional.length < 1) {
          throw new MdError(
            "parse_error",
            "Usage: md append [--deep] [--before] <file> [id] [content]",
          );
        }
        // Check if second positional is an ID (8 hex chars) or content
        const hasId = positional.length >= 2 && isValidId(positional[1]);
        const id = hasId ? positional[1] : null;
        const content = hasId
          ? (positional[2] ?? await readStdin())
          : (positional[1] ?? await readStdin());
        output = await cmdAppend(
          positional[0],
          id,
          content,
          flags.deep,
          flags.before,
          flags.json,
        );
        break;
      }

      case "empty": {
        if (positional.length < 2) {
          throw new MdError(
            "parse_error",
            "Usage: md empty [--deep] <file> <id>",
          );
        }
        output = await cmdEmpty(
          positional[0],
          positional[1],
          flags.deep,
          flags.json,
        );
        break;
      }

      case "remove": {
        if (positional.length < 2) {
          throw new MdError("parse_error", "Usage: md remove <file> <id>");
        }
        output = await cmdRemove(positional[0], positional[1], flags.json);
        break;
      }

      case "search": {
        if (positional.length < 2) {
          throw new MdError(
            "parse_error",
            "Usage: md search [--summary] <file> <pattern>",
          );
        }
        output = await cmdSearch(
          positional[0],
          positional[1],
          flags.summary,
          flags.json,
        );
        break;
      }

      case "concat": {
        if (positional.length < 1) {
          throw new MdError(
            "parse_error",
            "Usage: md concat [--shift[=N]] <files...>",
          );
        }
        output = await cmdConcat(positional, flags.shift);
        break;
      }

      case "meta": {
        if (positional.length < 1) {
          throw new MdError(
            "parse_error",
            "Usage: md meta <file> [key] or md meta <file> --set <key> <value>",
          );
        }
        const file = positional[0];
        const key = positional[1] ?? null;
        const value = flags.set ? (positional[2] ?? null) : null;
        if (flags.set && !key) {
          throw new MdError(
            "parse_error",
            "Usage: md meta <file> --set <key> <value>",
          );
        }
        if (flags.del && !key) {
          throw new MdError("parse_error", "Usage: md meta <file> --del <key>");
        }
        output = await cmdMeta(file, key, value, flags.del, flags.h1);
        break;
      }

      case "create": {
        if (positional.length < 1) {
          throw new MdError(
            "parse_error",
            "Usage: md create <file> [--title T] [--meta k=v] [content]",
          );
        }
        const content = positional[1] ?? null;
        output = await cmdCreate(
          positional[0],
          flags.title,
          flags.meta,
          flags.force,
          content,
        );
        break;
      }

      default:
        printUsage();
        Deno.exit(1);
    }

    if (output) {
      console.log(output);
    }
  } catch (e) {
    if (e instanceof MdError) {
      console.error(e.format());
      Deno.exit(1);
    }
    throw e;
  }
}

// Run if executed directly
if (import.meta.main) {
  await main(Deno.args);
}
