// Main module exports for markdown-surgeon

// ============================================================================
// Domain entities
// ============================================================================

export type {
  Document,
  ErrorCode,
  MutationResult,
  SearchMatch,
  SearchSummary,
  Section,
} from "./domain/entities/document.ts";
export { MdError } from "./domain/entities/document.ts";

// ============================================================================
// Domain ports (interfaces)
// ============================================================================

export type { FileSystem } from "./domain/ports/filesystem.ts";
export type { HashService } from "./domain/ports/hash-service.ts";
export type { YamlService } from "./domain/ports/yaml-service.ts";

// ============================================================================
// Use cases
// ============================================================================

export { ParseDocumentUseCase } from "./domain/use-cases/parse-document.ts";
export { ReadSectionUseCase } from "./domain/use-cases/read-section.ts";
export { WriteSectionUseCase } from "./domain/use-cases/write-section.ts";
export { AppendSectionUseCase } from "./domain/use-cases/append-section.ts";
export { RemoveSectionUseCase } from "./domain/use-cases/remove-section.ts";
export { SearchUseCase } from "./domain/use-cases/search.ts";
export { ManageFrontmatterUseCase } from "./domain/use-cases/manage-frontmatter.ts";

// ============================================================================
// Adapters
// ============================================================================

export { DenoFileSystem } from "./adapters/filesystem/deno-fs.ts";
export { InMemoryFileSystem } from "./adapters/filesystem/in-memory-fs.ts";
export { Blake3HashService } from "./adapters/services/blake3-hash.ts";
export { YamlParserService } from "./adapters/services/yaml-parser.ts";

// ============================================================================
// CLI
// ============================================================================

export { main } from "./cli.ts";
