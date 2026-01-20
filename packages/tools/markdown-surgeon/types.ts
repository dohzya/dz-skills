/** Represents a section in the Markdown document */
export interface Section {
  id: string;
  level: number;
  title: string;
  line: number; // 1-indexed line number of the header
  lineEnd: number; // 1-indexed line number of last content line (before next section or EOF)
}

/** Parsed document with sections and raw lines */
export interface Document {
  sections: Section[];
  lines: string[];
  frontmatter: string | null; // Raw frontmatter including delimiters, or null
  frontmatterEndLine: number; // 0 if no frontmatter, otherwise line after closing ---
}

/** Result of a write/append/empty/remove operation */
export interface MutationResult {
  action: "updated" | "created" | "appended" | "emptied" | "removed";
  id: string;
  lineStart: number;
  lineEnd?: number;
  linesAdded: number;
  linesRemoved: number;
}

/** Search match */
export interface SearchMatch {
  sectionId: string | null; // null if outside any section
  line: number;
  content: string;
}

/** Search summary entry */
export interface SearchSummary {
  id: string;
  level: number;
  title: string;
  lines: number[];
  matchCount: number;
}

/** Error codes */
export type ErrorCode =
  | "file_not_found"
  | "section_not_found"
  | "parse_error"
  | "invalid_id"
  | "io_error";

/** Structured error */
export class MdError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public file?: string,
    public id?: string,
  ) {
    super(message);
    this.name = "MdError";
  }

  format(): string {
    return `error: ${this.code}\n${this.message}`;
  }
}
