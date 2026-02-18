# Hexagonal Architecture Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor worklog and markdown-surgeon to hexagonal architecture with clean Domain/Ports/Adapters separation

**Architecture:** 3-layer hexagonal (Entities → Ports → Use Cases → Adapters → CLI). Immutable entities, business logic in use cases, infrastructure in adapters. Worklog depends on markdown-surgeon via adapter.

**Tech Stack:** Deno, TypeScript, Cliffy, Zod, existing CLI tests as safety net

**Strategy:** Start with markdown-surgeon (1325 lines, simpler), then worklog (6603 lines). CLI tests validate behavior unchanged.

---

## Phase 1: Markdown-Surgeon Refactoring

### Task 1.1: Create base directory structure

**Files:**

- Create: `packages/tools/markdown-surgeon/domain/entities/.gitkeep`
- Create: `packages/tools/markdown-surgeon/domain/use-cases/.gitkeep`
- Create: `packages/tools/markdown-surgeon/domain/ports/.gitkeep`
- Create: `packages/tools/markdown-surgeon/adapters/filesystem/.gitkeep`
- Create: `packages/tools/markdown-surgeon/adapters/services/.gitkeep`
- Create: `packages/tools/markdown-surgeon/adapters/cli/.gitkeep`

**Step 1: Create directory structure**

```bash
cd packages/tools/markdown-surgeon
mkdir -p domain/entities domain/use-cases domain/ports
mkdir -p adapters/filesystem adapters/services adapters/cli
touch domain/entities/.gitkeep domain/use-cases/.gitkeep domain/ports/.gitkeep
touch adapters/filesystem/.gitkeep adapters/services/.gitkeep adapters/cli/.gitkeep
```

**Step 2: Verify structure**

```bash
tree -L 3 -a
```

Expected: Directory tree with domain/ and adapters/ folders

**Step 3: Commit**

```bash
git add .
git commit -m "feat(md): create hexagonal architecture structure

Initialize directory structure for markdown-surgeon hexagonal refactoring:
- domain/ (entities, use-cases, ports)
- adapters/ (filesystem, services, cli)

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 1.2: Extract Document entity

**Files:**

- Create: `packages/tools/markdown-surgeon/domain/entities/document.ts`
- Reference: `packages/tools/markdown-surgeon/types.ts` (current implementation)

**Step 1: Write entity types**

```typescript
// domain/entities/document.ts

/**
 * Immutable document entity representing a parsed markdown document.
 */
export type Document = {
  readonly sections: readonly Section[];
};

export type Section = {
  readonly id: string;
  readonly title: string;
  readonly level: number;
  readonly line: number;
  readonly content: string;
};

/**
 * Result of a mutation operation on a document.
 */
export type MutationResult = {
  readonly action: "created" | "updated" | "removed";
  readonly id: string;
  readonly lineStart: number;
  readonly lineEnd: number | null;
  readonly linesAdded: number;
  readonly linesRemoved: number;
};

/**
 * Search match in a document.
 */
export type SearchMatch = {
  readonly sectionId: string | null;
  readonly line: number;
  readonly content: string;
};

export type SearchSummary = {
  readonly matches: readonly SearchMatch[];
  readonly totalMatches: number;
};
```

**Step 2: Verify types compile**

```bash
deno check domain/entities/document.ts
```

Expected: No errors

**Step 3: Commit**

```bash
git add domain/entities/document.ts
git commit -m "feat(md): add immutable Document entity

Define core domain entities as immutable TypeScript types:
- Document with sections
- Section with id, title, level, line, content
- MutationResult for tracking changes
- SearchMatch and SearchSummary

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 1.3: Define FileSystem port

**Files:**

- Create: `packages/tools/markdown-surgeon/domain/ports/filesystem.ts`

**Step 1: Write FileSystem interface**

```typescript
// domain/ports/filesystem.ts

/**
 * Port for filesystem operations.
 * Allows decoupling domain logic from Deno-specific file I/O.
 */
export interface FileSystem {
  /**
   * Read file content as string.
   * @throws Error if file doesn't exist
   */
  readFile(path: string): Promise<string>;

  /**
   * Write string content to file.
   * Creates parent directories if needed.
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * Check if file exists.
   */
  exists(path: string): Promise<boolean>;

  /**
   * List files matching glob pattern.
   */
  glob(pattern: string): AsyncIterable<string>;
}
```

**Step 2: Verify types compile**

```bash
deno check domain/ports/filesystem.ts
```

Expected: No errors

**Step 3: Commit**

```bash
git add domain/ports/filesystem.ts
git commit -m "feat(md): add FileSystem port interface

Define FileSystem interface for domain layer:
- readFile/writeFile for content operations
- exists for file checks
- glob for pattern matching

No Deno dependencies - pure interface.

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 1.4: Define HashService and YamlService ports

**Files:**

- Create: `packages/tools/markdown-surgeon/domain/ports/hash-service.ts`
- Create: `packages/tools/markdown-surgeon/domain/ports/yaml-service.ts`

**Step 1: Write HashService interface**

```typescript
// domain/ports/hash-service.ts

/**
 * Port for generating content hashes (used for section IDs).
 */
export interface HashService {
  /**
   * Generate short hash from content.
   * @returns 8-character hash string
   */
  hash(content: string): string;
}
```

**Step 2: Write YamlService interface**

```typescript
// domain/ports/yaml-service.ts

/**
 * Port for YAML parsing and stringification.
 */
export interface YamlService {
  /**
   * Parse YAML string to JavaScript object.
   * @throws Error if YAML is invalid
   */
  parse(yaml: string): unknown;

  /**
   * Stringify JavaScript object to YAML.
   */
  stringify(data: unknown): string;

  /**
   * Get nested value from object using dot notation.
   * Example: getNestedValue(obj, "foo.bar.baz")
   */
  getNestedValue(obj: unknown, path: string): unknown;

  /**
   * Set nested value in object using dot notation.
   */
  setNestedValue(obj: unknown, path: string, value: unknown): unknown;

  /**
   * Delete nested value from object using dot notation.
   */
  deleteNestedValue(obj: unknown, path: string): unknown;

  /**
   * Format value for display (handle dates, special types).
   */
  formatValue(value: unknown): string;
}
```

**Step 3: Verify types compile**

```bash
deno check domain/ports/hash-service.ts domain/ports/yaml-service.ts
```

Expected: No errors

**Step 4: Commit**

```bash
git add domain/ports/hash-service.ts domain/ports/yaml-service.ts
git commit -m "feat(md): add HashService and YamlService ports

Define service interfaces:
- HashService for section ID generation
- YamlService for frontmatter parsing/manipulation

Pure interfaces with no implementation dependencies.

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 1.5: Implement DenoFileSystem adapter

**Files:**

- Create: `packages/tools/markdown-surgeon/adapters/filesystem/deno-fs.ts`
- Reference: Current file I/O in `cli.ts`

**Step 1: Write DenoFileSystem implementation**

```typescript
// adapters/filesystem/deno-fs.ts
import { expandGlob } from "@std/fs";
import { dirname } from "@std/path";
import { ensureDir } from "@std/fs";
import type { FileSystem } from "../../domain/ports/filesystem.ts";

/**
 * Deno-based filesystem adapter.
 */
export class DenoFileSystem implements FileSystem {
  async readFile(path: string): Promise<string> {
    return await Deno.readTextFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await ensureDir(dirname(path));
    await Deno.writeTextFile(path, content);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await Deno.stat(path);
      return true;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return false;
      }
      throw error;
    }
  }

  async *glob(pattern: string): AsyncIterable<string> {
    for await (const entry of expandGlob(pattern)) {
      if (entry.isFile) {
        yield entry.path;
      }
    }
  }
}
```

**Step 2: Verify implementation compiles**

```bash
deno check adapters/filesystem/deno-fs.ts
```

Expected: No errors

**Step 3: Commit**

```bash
git add adapters/filesystem/deno-fs.ts
git commit -m "feat(md): implement DenoFileSystem adapter

Implement FileSystem port using Deno APIs:
- Uses Deno.readTextFile/writeTextFile
- Handles directory creation via ensureDir
- Implements glob via expandGlob

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 1.6: Implement InMemoryFileSystem for tests

**Files:**

- Create: `packages/tools/markdown-surgeon/adapters/filesystem/in-memory-fs.ts`

**Step 1: Write InMemoryFileSystem implementation**

```typescript
// adapters/filesystem/in-memory-fs.ts
import type { FileSystem } from "../../domain/ports/filesystem.ts";

/**
 * In-memory filesystem for testing.
 * No real I/O, all operations on Map.
 */
export class InMemoryFileSystem implements FileSystem {
  private files = new Map<string, string>();

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async *glob(pattern: string): AsyncIterable<string> {
    // Simple glob: just match files starting with pattern prefix
    const prefix = pattern.replace(/\*/g, "");
    for (const [path] of this.files) {
      if (path.startsWith(prefix) || pattern === "**/*") {
        yield path;
      }
    }
  }

  // Test helpers
  clear(): void {
    this.files.clear();
  }

  getAll(): Map<string, string> {
    return new Map(this.files);
  }

  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }
}
```

**Step 2: Verify implementation compiles**

```bash
deno check adapters/filesystem/in-memory-fs.ts
```

Expected: No errors

**Step 3: Commit**

```bash
git add adapters/filesystem/in-memory-fs.ts
git commit -m "feat(md): implement InMemoryFileSystem for tests

Add in-memory filesystem adapter for testing:
- All operations on Map (no real I/O)
- Test helpers: clear(), getAll(), setFile()
- Simple glob implementation

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 1.7: Implement Blake3HashService adapter

**Files:**

- Create: `packages/tools/markdown-surgeon/adapters/services/blake3-hash.ts`
- Reference: `packages/tools/markdown-surgeon/hash.ts` (current implementation)

**Step 1: Write Blake3HashService implementation**

```typescript
// adapters/services/blake3-hash.ts
import { encodeHex } from "@std/encoding/hex";
import type { HashService } from "../../domain/ports/hash-service.ts";

/**
 * Hash service using BLAKE3 algorithm.
 */
export class Blake3HashService implements HashService {
  hash(content: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    // Use crypto.subtle.digest with BLAKE3 if available, fallback to SHA-256
    // For now, use SHA-256 as BLAKE3 not in Web Crypto API
    const hashBuffer = crypto.subtle.digestSync("SHA-256", data);
    const hashHex = encodeHex(new Uint8Array(hashBuffer));

    // Return first 8 chars for section IDs
    return hashHex.slice(0, 8);
  }
}

/**
 * Validate section ID format.
 */
export function isValidId(id: string): boolean {
  return /^[a-f0-9]{8}$/.test(id);
}
```

**Step 2: Verify implementation compiles**

```bash
deno check adapters/services/blake3-hash.ts
```

Expected: No errors

**Step 3: Commit**

```bash
git add adapters/services/blake3-hash.ts
git commit -m "feat(md): implement Blake3HashService adapter

Implement HashService using crypto.subtle:
- Generate 8-char hex hash for section IDs
- Add isValidId helper for validation

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 1.8: Implement YamlParserService adapter

**Files:**

- Create: `packages/tools/markdown-surgeon/adapters/services/yaml-parser.ts`
- Reference: `packages/tools/markdown-surgeon/yaml.ts` (current implementation)

**Step 1: Copy and adapt yaml.ts to adapter**

This is a larger file, so we'll copy the existing implementation and make it conform to the YamlService interface.

```typescript
// adapters/services/yaml-parser.ts
import { parse, stringify } from "@std/yaml";
import type { YamlService } from "../../domain/ports/yaml-service.ts";

/**
 * YAML service using @std/yaml.
 */
export class YamlParserService implements YamlService {
  parse(yaml: string): unknown {
    return parse(yaml);
  }

  stringify(data: unknown): string {
    return stringify(data);
  }

  getNestedValue(obj: unknown, path: string): unknown {
    if (typeof obj !== "object" || obj === null) return undefined;

    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (typeof current !== "object" || current === null) return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  setNestedValue(obj: unknown, path: string, value: unknown): unknown {
    if (typeof obj !== "object" || obj === null) {
      throw new Error("Cannot set nested value on non-object");
    }

    const parts = path.split(".");
    const result = structuredClone(obj);
    let current: any = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
    return result;
  }

  deleteNestedValue(obj: unknown, path: string): unknown {
    if (typeof obj !== "object" || obj === null) {
      throw new Error("Cannot delete nested value from non-object");
    }

    const parts = path.split(".");
    const result = structuredClone(obj);
    let current: any = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        return result; // Path doesn't exist, return unchanged
      }
      current = current[part];
    }

    delete current[parts[parts.length - 1]];
    return result;
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return String(value);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
```

**Step 2: Verify implementation compiles**

```bash
deno check adapters/services/yaml-parser.ts
```

Expected: No errors

**Step 3: Commit**

```bash
git add adapters/services/yaml-parser.ts
git commit -m "feat(md): implement YamlParserService adapter

Implement YamlService using @std/yaml:
- parse/stringify for YAML operations
- Nested value manipulation (get/set/delete)
- Value formatting for display

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 1.9: Create ParseDocumentUseCase

**Files:**

- Create: `packages/tools/markdown-surgeon/domain/use-cases/parse-document.ts`
- Reference: `packages/tools/markdown-surgeon/parser.ts` (parseDocument function)

**Step 1: Write use case with dependencies**

```typescript
// domain/use-cases/parse-document.ts
import type { Document, Section } from "../entities/document.ts";
import type { HashService } from "../ports/hash-service.ts";

export type ParseDocumentInput = {
  content: string;
};

/**
 * Parse markdown content into structured document.
 */
export class ParseDocumentUseCase {
  constructor(private hashService: HashService) {}

  execute(input: ParseDocumentInput): Document {
    const { content } = input;
    const lines = content.split("\n");
    const sections: Section[] = [];

    let currentSection: {
      title: string;
      level: number;
      line: number;
      contentLines: string[];
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+?)(\s+\^([a-f0-9]{8}))?$/);

      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          const contentStr = currentSection.contentLines.join("\n").trim();
          const id = this.hashService.hash(
            `${currentSection.title}-${contentStr}`,
          );
          sections.push({
            id,
            title: currentSection.title,
            level: currentSection.level,
            line: currentSection.line,
            content: contentStr,
          });
        }

        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        currentSection = {
          title,
          level,
          line: i + 1, // 1-indexed
          contentLines: [],
        };
      } else if (currentSection) {
        currentSection.contentLines.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      const contentStr = currentSection.contentLines.join("\n").trim();
      const id = this.hashService.hash(
        `${currentSection.title}-${contentStr}`,
      );
      sections.push({
        id,
        title: currentSection.title,
        level: currentSection.level,
        line: currentSection.line,
        content: contentStr,
      });
    }

    return { sections };
  }
}
```

**Step 2: Verify use case compiles**

```bash
deno check domain/use-cases/parse-document.ts
```

Expected: No errors

**Step 3: Write simple test**

```typescript
// domain/use-cases/parse-document.test.ts
import { assertEquals } from "@std/assert";
import { ParseDocumentUseCase } from "./parse-document.ts";

// Mock hash service for testing
class MockHashService {
  hash(content: string): string {
    return "12345678"; // Fixed hash for testing
  }
}

Deno.test("ParseDocumentUseCase - parses headers and content", () => {
  const useCase = new ParseDocumentUseCase(new MockHashService());
  const doc = useCase.execute({
    content: `# Title 1

Content 1

## Title 2

Content 2`,
  });

  assertEquals(doc.sections.length, 2);
  assertEquals(doc.sections[0].title, "Title 1");
  assertEquals(doc.sections[0].level, 1);
  assertEquals(doc.sections[0].content, "Content 1");
  assertEquals(doc.sections[1].title, "Title 2");
  assertEquals(doc.sections[1].level, 2);
});
```

**Step 4: Run test**

```bash
deno test --no-check -A domain/use-cases/parse-document.test.ts
```

Expected: Test passes

**Step 5: Commit**

```bash
git add domain/use-cases/parse-document.ts domain/use-cases/parse-document.test.ts
git commit -m "feat(md): add ParseDocumentUseCase

Implement markdown parsing use case:
- Extracts sections with headers
- Generates IDs via HashService
- Pure business logic, no I/O

Includes unit test with mock HashService.

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

**Note:** At this point, the pattern is established. The remaining tasks follow the same structure:

1. Create use case in domain/use-cases/
2. Write tests with mocks
3. Implement adapters in adapters/
4. Wire everything in cli.ts
5. Run CLI tests to validate

Due to length constraints, I'll provide a high-level task list for the remaining work, then detail the critical integration points.

---

### Task 1.10-1.20: Remaining Markdown-Surgeon Use Cases

**Pattern for each use case:**

- ReadSectionUseCase (read section by ID or title)
- WriteSectionUseCase (write/update section content)
- AppendSectionUseCase (append to section)
- RemoveSectionUseCase (delete section)
- SearchUseCase (search document content)
- ManageFrontmatterUseCase (get/set/delete frontmatter fields)
- OutlineUseCase (generate document outline)

Each follows:

1. Define use case class with port dependencies
2. Write unit test with mocks
3. Verify test passes
4. Commit

---

### Task 1.21: Create CLI commands adapter

**Files:**

- Create: `packages/tools/markdown-surgeon/adapters/cli/commands.ts`
- Create: `packages/tools/markdown-surgeon/adapters/cli/formatter.ts`
- Modify: `packages/tools/markdown-surgeon/cli.ts` (wire everything)

**Step 1: Write commands adapter**

Wire all use cases to Cliffy commands. The commands adapter instantiates use cases and calls them.

**Step 2: Write formatter adapter**

Move all `formatX()` functions from old cli.ts to formatter.ts.

**Step 3: Update cli.ts to wire dependencies**

```typescript
// cli.ts
import { Command } from "@cliffy/command";
import { DenoFileSystem } from "./adapters/filesystem/deno-fs.ts";
import { Blake3HashService } from "./adapters/services/blake3-hash.ts";
import { YamlParserService } from "./adapters/services/yaml-parser.ts";
import { ParseDocumentUseCase } from "./domain/use-cases/parse-document.ts";
// ... import all use cases

// DI - wire dependencies
const fs = new DenoFileSystem();
const hashService = new Blake3HashService();
const yamlService = new YamlParserService();

// Instantiate use cases
const parseDoc = new ParseDocumentUseCase(hashService);
const readSection = new ReadSectionUseCase(parseDoc);
// ... all use cases

// Create commands
const outlineCmd = new Command()
  .description("Show document outline")
  .arguments("<file:string>")
  .action(async (_, file) => {
    const content = await fs.readFile(file);
    const doc = parseDoc.execute({ content });
    console.log(formatter.formatOutline(doc));
  });

// Wire all commands
await new Command()
  .name("md")
  .version("0.6.0")
  .command("outline", outlineCmd)
  // ... all commands
  .parse(Deno.args);
```

**Step 4: Run CLI tests**

```bash
deno test --no-check -A cli.test.ts
```

Expected: All tests pass (unchanged behavior)

**Step 5: Commit**

```bash
git add adapters/cli/ cli.ts
git commit -m "feat(md): wire hexagonal architecture in CLI

Complete markdown-surgeon hexagonal refactoring:
- Commands adapter connects use cases to Cliffy
- Formatter adapter handles output formatting
- cli.ts does DI and wiring
- All CLI tests pass (behavior unchanged)

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 1.22: Update mod.ts exports

**Files:**

- Modify: `packages/tools/markdown-surgeon/mod.ts`

**Step 1: Export public API**

```typescript
// mod.ts
// Domain entities
export * from "./domain/entities/document.ts";

// Domain use cases (for reuse by other apps like worklog)
export { ParseDocumentUseCase } from "./domain/use-cases/parse-document.ts";
export { ReadSectionUseCase } from "./domain/use-cases/read-section.ts";
export { WriteSectionUseCase } from "./domain/use-cases/write-section.ts";
export { AppendSectionUseCase } from "./domain/use-cases/append-section.ts";
export { RemoveSectionUseCase } from "./domain/use-cases/remove-section.ts";
export { SearchUseCase } from "./domain/use-cases/search.ts";
export { ManageFrontmatterUseCase } from "./domain/use-cases/manage-frontmatter.ts";

// Domain ports (for implementing custom adapters)
export type { FileSystem } from "./domain/ports/filesystem.ts";
export type { HashService } from "./domain/ports/hash-service.ts";
export type { YamlService } from "./domain/ports/yaml-service.ts";

// Adapters (for convenience)
export { DenoFileSystem } from "./adapters/filesystem/deno-fs.ts";
export { InMemoryFileSystem } from "./adapters/filesystem/in-memory-fs.ts";
export { Blake3HashService } from "./adapters/services/blake3-hash.ts";
export { YamlParserService } from "./adapters/services/yaml-parser.ts";

// CLI (if needed)
export { main } from "./cli.ts";
```

**Step 2: Verify exports compile**

```bash
deno check mod.ts
```

Expected: No errors

**Step 3: Commit**

```bash
git add mod.ts
git commit -m "feat(md): export public API via mod.ts

Export domain entities, use cases, ports, and adapters:
- Use cases for reuse by worklog
- Ports for custom adapter implementations
- Adapters for convenience

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 1.23: Delete old files

**Files:**

- Delete: `packages/tools/markdown-surgeon/parser.ts`
- Delete: `packages/tools/markdown-surgeon/hash.ts`
- Delete: `packages/tools/markdown-surgeon/yaml.ts`
- Delete: `packages/tools/markdown-surgeon/magic.ts`
- Keep: `packages/tools/markdown-surgeon/types.ts` (for backward compat, re-export from domain)

**Step 1: Update types.ts to re-export**

```typescript
// types.ts - Backward compatibility layer
export type {
  Document,
  MutationResult,
  SearchMatch,
  SearchSummary,
  Section,
} from "./domain/entities/document.ts";

export class MdError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "MdError";
  }
}
```

**Step 2: Delete old implementation files**

```bash
rm parser.ts hash.ts yaml.ts magic.ts
```

**Step 3: Run all tests**

```bash
deno test --no-check -A
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(md): remove old monolithic files

Delete old implementation files (parser, hash, yaml, magic).
Keep types.ts as backward compatibility layer.

All tests passing - hexagonal refactoring complete for markdown-surgeon.

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Phase 2: Worklog Refactoring

**Strategy:** Same pattern as markdown-surgeon, but:

1. More use cases (~30 vs ~7)
2. Depends on markdown-surgeon via MarkdownSurgeonAdapter
3. More complex domain (tasks, checkpoints, todos, scopes)

### Task 2.1: Create worklog directory structure

Same as Task 1.1, but for `packages/tools/worklog/`.

---

### Task 2.2-2.10: Extract worklog entities

**Files to create:**

- `domain/entities/task.ts`
- `domain/entities/checkpoint.ts`
- `domain/entities/todo.ts`
- `domain/entities/entry.ts`
- `domain/entities/index.ts`
- `domain/entities/scope.ts`
- `domain/entities/task-helpers.ts` (pure functions)

**Pattern:** Extract from `types.ts`, convert to immutable types.

---

### Task 2.11-2.20: Define worklog ports

**Files to create:**

- `domain/ports/task-repository.ts`
- `domain/ports/index-repository.ts`
- `domain/ports/scope-repository.ts`
- `domain/ports/markdown-service.ts`
- `domain/ports/git-service.ts`
- `domain/ports/filesystem.ts`

---

### Task 2.21: Implement MarkdownSurgeonAdapter

**Files:**

- Create: `adapters/markdown/surgeon-adapter.ts`

**Critical:** This adapter uses markdown-surgeon use cases to implement MarkdownService port.

```typescript
// adapters/markdown/surgeon-adapter.ts
import {
  ParseDocumentUseCase,
  ReadSectionUseCase,
  WriteSectionUseCase,
} from "../../../markdown-surgeon/mod.ts";
import type { MarkdownService } from "../../domain/ports/markdown-service.ts";
import type { Checkpoint, Entry, Task } from "../../domain/entities/task.ts";

export type ParsedTaskData = {
  meta: {
    id: string;
    uid: string;
    name: string;
    desc: string;
    status: string;
    created_at: string;
    // ... all frontmatter fields
  };
  traces: Entry[];
  checkpoints: Checkpoint[];
  todos: Todo[];
};

export class MarkdownSurgeonAdapter implements MarkdownService {
  constructor(
    private parseDoc: ParseDocumentUseCase,
    private readSection: ReadSectionUseCase,
    private writeSection: WriteSectionUseCase,
  ) {}

  async parseTaskFile(content: string): Promise<ParsedTaskData> {
    const doc = this.parseDoc.execute({ content });

    // Extract frontmatter
    const frontmatterSection = doc.sections.find((s) => s.line === 0);
    // Parse YAML frontmatter...

    // Extract traces section
    const tracesSection = doc.sections.find((s) => s.title === "Traces");
    // Parse traces...

    return {
      meta: {/* ... */},
      traces: [/* ... */],
      checkpoints: [/* ... */],
      todos: [/* ... */],
    };
  }

  async serializeTask(
    task: Task,
    traces: Entry[],
    checkpoints: Checkpoint[],
  ): Promise<string> {
    // Build markdown content using markdown-surgeon use cases
    // ...
  }
}
```

---

### Task 2.22-2.60: Implement worklog use cases

**Categories:**

1. Task management (create, show, list, update-status, update-meta)
2. Trace management (add-trace, list-traces, checkpoint)
3. Todo management (add, list, update, next)
4. Scope management (list, add, sync-worktrees)
5. Import (import-tasks, import-scope-to-tag)
6. Summary (generate-summary)

**Pattern for each:** Use case → Unit test → Commit

---

### Task 2.61-2.65: Implement worklog adapters

**Repositories:**

- `adapters/repositories/markdown-task-repo.ts` (uses MarkdownSurgeonAdapter)
- `adapters/repositories/json-index-repo.ts`
- `adapters/repositories/json-scope-repo.ts`

**Services:**

- `adapters/git/deno-git.ts` (git operations)
- `adapters/filesystem/deno-fs.ts` (copy from markdown-surgeon or reuse)

---

### Task 2.66: Wire worklog CLI

**Files:**

- Create: `adapters/cli/commands/task-commands.ts`
- Create: `adapters/cli/commands/trace-commands.ts`
- Create: `adapters/cli/commands/todo-commands.ts`
- Create: `adapters/cli/commands/scope-commands.ts`
- Create: `adapters/cli/commands/import-commands.ts`
- Create: `adapters/cli/commands/run-command.ts`
- Create: `adapters/cli/formatter.ts`
- Modify: `cli.ts` (DI + wire all commands)

---

### Task 2.67: Run worklog CLI tests

**Step 1: Run all tests**

```bash
cd packages/tools/worklog
deno test --no-check -A cli.test.ts
```

Expected: All tests pass

**Step 2: If tests fail, debug and fix**

Iterate on adapters/use cases until tests pass.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(wl): complete hexagonal architecture refactoring

Complete worklog hexagonal refactoring:
- 30+ use cases in domain/use-cases/
- Repositories, services, CLI adapters
- Uses markdown-surgeon via MarkdownSurgeonAdapter
- All CLI tests pass (behavior unchanged)

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 2.68: Update worklog mod.ts

Export public API (entities, use cases, ports) for potential reuse.

---

### Task 2.69: Delete old worklog files

Keep `types.ts` as backward compatibility layer, delete monolithic `cli.ts` logic.

---

## Phase 3: Final Validation

### Task 3.1: Run full test suite

```bash
task test
```

Expected: All tests pass (worklog + markdown-surgeon)

---

### Task 3.2: Run task validate

```bash
task validate
```

Expected: fmt + check + lint + test all pass

---

### Task 3.3: Update documentation

**Files:**

- Update: `README.md` (mention architecture if needed)
- Update: `AGENTS.md` (update testing commands if needed)

---

### Task 3.4: Final commit

```bash
git add -A
git commit -m "feat: complete hexagonal architecture refactoring

Refactor worklog and markdown-surgeon to hexagonal architecture:
- Clean separation: Domain / Ports / Adapters
- Immutable entities (functional approach)
- Business logic in use cases
- Infrastructure in adapters
- 100% test coverage maintained

All existing CLI tests pass - zero behavior change.

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Success Criteria

✅ All CLI tests pass without modification ✅ `task validate` passes (fmt + check + lint + test) ✅ Domain layer has 0 external dependencies ✅ Use cases testable with simple mocks ✅ Markdown-surgeon API exported via mod.ts ✅ Worklog uses markdown-surgeon via adapter ✅ File count: ~70 files total (vs 2 monolithic files) ✅ Average file size: 100-150 lines (vs 6603 lines)

---

## Plan complete!

**Estimated effort:** 10-15 hours (given the scope)

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach would you like?
