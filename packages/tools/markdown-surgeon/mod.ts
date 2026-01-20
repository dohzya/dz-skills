// Main module exports for markdown-surgeon

// Types
export type {
  Document,
  ErrorCode,
  MutationResult,
  SearchMatch,
  SearchSummary,
  Section,
} from "./types.ts";
export { MdError } from "./types.ts";

// Parser functions
export {
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

// Hash utilities
export { isValidId, sectionHash } from "./hash.ts";

// YAML utilities
export {
  deleteNestedValue,
  formatValue,
  getNestedValue,
  parseFrontmatter,
  setNestedValue,
  stringifyFrontmatter,
} from "./yaml.ts";

// Magic expressions
export { expandMagic } from "./magic.ts";

// CLI (for programmatic usage)
export { main } from "./cli.ts";
