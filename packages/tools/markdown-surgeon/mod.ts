// Main module exports for markdown-surgeon

// Types
export type {
  Section,
  Document,
  MutationResult,
  SearchMatch,
  SearchSummary,
  ErrorCode,
} from "./types.ts";
export { MdError } from "./types.ts";

// Parser functions
export {
  parseDocument,
  findSection,
  findSectionAtLine,
  getSectionEndLine,
  getSectionContent,
  serializeDocument,
  getFrontmatterContent,
  setFrontmatter,
  startsWithHeader,
} from "./parser.ts";

// Hash utilities
export { sectionHash, isValidId } from "./hash.ts";

// YAML utilities
export {
  getNestedValue,
  setNestedValue,
  deleteNestedValue,
  parseFrontmatter,
  stringifyFrontmatter,
  formatValue,
} from "./yaml.ts";

// Magic expressions
export { expandMagic } from "./magic.ts";

// CLI (for programmatic usage)
export { main } from "./cli.ts";
