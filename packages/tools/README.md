# @dz/tools

Reusable TypeScript utilities for markdown manipulation.

## Installation

```typescript
// Import all markdown-surgeon exports
import { parseDocument, findSection } from "@dz/tools/markdown-surgeon";

// Import specific modules
import { expandMagic } from "@dz/tools/markdown-surgeon/magic";
import { sectionHash, isValidId } from "@dz/tools/markdown-surgeon/hash";

// CLI entry point
import { main } from "@dz/tools/markdown-surgeon/cli";
```

## Modules

### markdown-surgeon

Surgical manipulation of Markdown files by section.

#### Parser (`@dz/tools/markdown-surgeon/parser`)

```typescript
import {
  parseDocument,
  findSection,
  findSectionAtLine,
  getSectionEndLine,
  getSectionContent,
  serializeDocument,
  getFrontmatterContent,
  setFrontmatter,
  startsWithHeader,
} from "@dz/tools/markdown-surgeon/parser";

// Parse a markdown string
const doc = await parseDocument(content);

// Find a section by ID
const section = findSection(doc, "a3f2c1d0");

// Get section content
const text = getSectionContent(doc, section, deep);
```

#### Types (`@dz/tools/markdown-surgeon/types`)

```typescript
import type {
  Section,
  Document,
  MutationResult,
  SearchMatch,
  SearchSummary,
  ErrorCode,
} from "@dz/tools/markdown-surgeon/types";

import { MdError } from "@dz/tools/markdown-surgeon/types";
```

#### Hash (`@dz/tools/markdown-surgeon/hash`)

```typescript
import { sectionHash, isValidId } from "@dz/tools/markdown-surgeon/hash";

// Generate section ID
const id = await sectionHash(level, title, occurrenceIndex);

// Validate ID format
if (isValidId("a3f2c1d0")) { ... }
```

#### YAML (`@dz/tools/markdown-surgeon/yaml`)

```typescript
import {
  parseFrontmatter,
  stringifyFrontmatter,
  getNestedValue,
  setNestedValue,
  deleteNestedValue,
  formatValue,
} from "@dz/tools/markdown-surgeon/yaml";

// Parse YAML frontmatter
const meta = parseFrontmatter(yamlContent);

// Access nested values
const author = getNestedValue(meta, "author.name");
```

#### Magic (`@dz/tools/markdown-surgeon/magic`)

```typescript
import { expandMagic } from "@dz/tools/markdown-surgeon/magic";

// Expand magic expressions
const expanded = expandMagic("Updated: {dt:short}", meta);
// → "Updated: 2025-01-20 14:30"
```

Supported expressions:
- `{datetime}` or `{dt}` - ISO 8601 with timezone
- `{dt:short}` - Short format (YYYY-MM-DD HH:mm)
- `{date}` - Date only (YYYY-MM-DD)
- `{time}` - Time only (HH:MM:SS)
- `{meta:key}` - Value from frontmatter

#### CLI (`@dz/tools/markdown-surgeon/cli`)

```typescript
import { main } from "@dz/tools/markdown-surgeon/cli";

// Run CLI with arguments
await main(["outline", "doc.md"]);
```

## Publishing

```bash
cd packages/tools
deno publish
```

## License

MIT
