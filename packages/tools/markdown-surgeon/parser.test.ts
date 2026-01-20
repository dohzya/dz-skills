import { assertEquals, assertExists } from "@std/assert";
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

// parseDocument tests
Deno.test("parseDocument - parses simple markdown", async () => {
  const content = `# Title
Content here`;
  const doc = await parseDocument(content);

  assertEquals(doc.sections.length, 1);
  assertEquals(doc.sections[0].level, 1);
  assertEquals(doc.sections[0].title, "Title");
  assertEquals(doc.sections[0].line, 1);
  assertEquals(doc.lines.length, 2);
});

Deno.test("parseDocument - parses multiple sections", async () => {
  const content = `# Title
Content

## Subtitle
More content`;
  const doc = await parseDocument(content);

  assertEquals(doc.sections.length, 2);
  assertEquals(doc.sections[0].level, 1);
  assertEquals(doc.sections[0].title, "Title");
  assertEquals(doc.sections[1].level, 2);
  assertEquals(doc.sections[1].title, "Subtitle");
});

Deno.test("parseDocument - parses frontmatter", async () => {
  const content = `---
title: Test
author: John
---

# Title
Content`;
  const doc = await parseDocument(content);

  assertExists(doc.frontmatter);
  assertEquals(doc.frontmatter.includes("title: Test"), true);
  assertEquals(doc.frontmatterEndLine, 4);
  assertEquals(doc.sections.length, 1);
  assertEquals(doc.sections[0].line, 6);
});

Deno.test("parseDocument - handles empty document", async () => {
  const content = "";
  const doc = await parseDocument(content);

  assertEquals(doc.sections.length, 0);
  assertEquals(doc.lines.length, 1);
  assertEquals(doc.frontmatter, null);
});

Deno.test("parseDocument - ignores headers in code blocks", async () => {
  const content = `# Title

\`\`\`
# Not a header
\`\`\`

## Real Header`;
  const doc = await parseDocument(content);

  assertEquals(doc.sections.length, 2);
  assertEquals(doc.sections[0].title, "Title");
  assertEquals(doc.sections[1].title, "Real Header");
});

Deno.test("parseDocument - handles headers with different levels", async () => {
  const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;
  const doc = await parseDocument(content);

  assertEquals(doc.sections.length, 6);
  assertEquals(doc.sections[0].level, 1);
  assertEquals(doc.sections[1].level, 2);
  assertEquals(doc.sections[2].level, 3);
  assertEquals(doc.sections[3].level, 4);
  assertEquals(doc.sections[4].level, 5);
  assertEquals(doc.sections[5].level, 6);
});

Deno.test("parseDocument - generates unique IDs for duplicate titles", async () => {
  const content = `# Title
## Title
# Title`;
  const doc = await parseDocument(content);

  assertEquals(doc.sections.length, 3);
  // All three should have different IDs
  assertEquals(doc.sections[0].id === doc.sections[1].id, false);
  assertEquals(doc.sections[0].id === doc.sections[2].id, false);
  assertEquals(doc.sections[1].id === doc.sections[2].id, false);
});

Deno.test("parseDocument - sets lineEnd correctly", async () => {
  const content = `# First
Content 1

# Second
Content 2`;
  const doc = await parseDocument(content);

  assertEquals(doc.sections[0].lineEnd, 3);
  assertEquals(doc.sections[1].lineEnd, 5);
});

Deno.test("parseDocument - trims trailing empty lines", async () => {
  const content = `# Title
Content


`;
  const doc = await parseDocument(content);

  assertEquals(doc.sections[0].lineEnd, 2);
});

// findSection tests
Deno.test("findSection - finds section by ID", async () => {
  const content = `# Title
Content`;
  const doc = await parseDocument(content);

  const section = findSection(doc, doc.sections[0].id);
  assertExists(section);
  assertEquals(section.title, "Title");
});

Deno.test("findSection - returns undefined for non-existent ID", async () => {
  const content = `# Title
Content`;
  const doc = await parseDocument(content);

  const section = findSection(doc, "nonexistent");
  assertEquals(section, undefined);
});

// findSectionAtLine tests
Deno.test("findSectionAtLine - finds section containing line", async () => {
  const content = `# First
Content 1
Content 2

# Second
Content 3`;
  const doc = await parseDocument(content);

  const section1 = findSectionAtLine(doc, 2);
  assertExists(section1);
  assertEquals(section1.title, "First");

  const section2 = findSectionAtLine(doc, 6);
  assertExists(section2);
  assertEquals(section2.title, "Second");
});

Deno.test("findSectionAtLine - returns undefined for line before first section", async () => {
  const content = `Some content

# Title`;
  const doc = await parseDocument(content);

  const section = findSectionAtLine(doc, 1);
  assertEquals(section, undefined);
});

Deno.test("findSectionAtLine - handles frontmatter", async () => {
  const content = `---
title: Test
---

# Title`;
  const doc = await parseDocument(content);

  const section = findSectionAtLine(doc, 2);
  assertEquals(section, undefined);

  const section2 = findSectionAtLine(doc, 5);
  assertExists(section2);
  assertEquals(section2.title, "Title");
});

// getSectionContent tests
Deno.test("getSectionContent - gets content without deep flag", async () => {
  const content = `# Title
Content line 1
Content line 2`;
  const doc = await parseDocument(content);

  const sectionContent = getSectionContent(doc, doc.sections[0], false);
  assertEquals(sectionContent, "Content line 1\nContent line 2");
});

Deno.test("getSectionContent - stops at next header without deep", async () => {
  const content = `# First
Content 1

## Nested
Nested content`;
  const doc = await parseDocument(content);

  const sectionContent = getSectionContent(doc, doc.sections[0], false);
  assertEquals(sectionContent, "Content 1\n");
});

Deno.test("getSectionContent - includes nested sections with deep flag", async () => {
  const content = `# First
Content 1

## Nested
Nested content

# Second`;
  const doc = await parseDocument(content);

  const sectionContent = getSectionContent(doc, doc.sections[0], true);
  assertEquals(sectionContent.includes("Content 1"), true);
  assertEquals(sectionContent.includes("## Nested"), true);
  assertEquals(sectionContent.includes("Nested content"), true);
});

Deno.test("getSectionContent - deep flag stops at same or higher level", async () => {
  const content = `# First
Content 1

## Nested 1
Nested content 1

## Nested 2
Nested content 2

# Second`;
  const doc = await parseDocument(content);

  const sectionContent = getSectionContent(doc, doc.sections[0], true);
  assertEquals(sectionContent.includes("Nested 1"), true);
  assertEquals(sectionContent.includes("Nested 2"), true);
  assertEquals(sectionContent.includes("# Second"), false);
});

// getSectionEndLine tests
Deno.test("getSectionEndLine - returns lineEnd without deep", async () => {
  const content = `# First
Content

## Nested`;
  const doc = await parseDocument(content);

  const endLine = getSectionEndLine(doc, doc.sections[0], false);
  assertEquals(endLine, doc.sections[0].lineEnd);
});

Deno.test("getSectionEndLine - extends to deeper sections with deep", async () => {
  const content = `# First
Content

## Nested
Nested content

# Second`;
  const doc = await parseDocument(content);

  const endLine = getSectionEndLine(doc, doc.sections[0], true);
  assertEquals(endLine, 6);
});

// serializeDocument tests
Deno.test("serializeDocument - converts document back to string", async () => {
  const content = `# Title
Content`;
  const doc = await parseDocument(content);

  const serialized = serializeDocument(doc);
  assertEquals(serialized, content);
});

Deno.test("serializeDocument - preserves frontmatter", async () => {
  const content = `---
title: Test
---

# Title`;
  const doc = await parseDocument(content);

  const serialized = serializeDocument(doc);
  assertEquals(serialized, content);
});

// getFrontmatterContent tests
Deno.test("getFrontmatterContent - extracts YAML without delimiters", async () => {
  const content = `---
title: Test
author: John
---

# Title`;
  const doc = await parseDocument(content);

  const yamlContent = getFrontmatterContent(doc);
  assertEquals(yamlContent, "title: Test\nauthor: John");
});

Deno.test("getFrontmatterContent - returns empty string for no frontmatter", async () => {
  const content = `# Title
Content`;
  const doc = await parseDocument(content);

  const yamlContent = getFrontmatterContent(doc);
  assertEquals(yamlContent, "");
});

// setFrontmatter tests
Deno.test("setFrontmatter - adds frontmatter to document without one", async () => {
  const content = `# Title
Content`;
  const doc = await parseDocument(content);

  setFrontmatter(doc, "title: Test");

  assertEquals(doc.frontmatter, "---\ntitle: Test\n---");
  assertEquals(doc.lines[0], "---");
  assertEquals(doc.lines[1], "title: Test");
  assertEquals(doc.lines[2], "---");
  assertEquals(doc.lines[3], "");
});

Deno.test("setFrontmatter - replaces existing frontmatter", async () => {
  const content = `---
title: Old
---

# Title`;
  const doc = await parseDocument(content);

  setFrontmatter(doc, "title: New\nauthor: John");

  assertEquals(doc.frontmatter?.includes("title: New"), true);
  assertEquals(doc.frontmatter?.includes("author: John"), true);
});

Deno.test("setFrontmatter - removes frontmatter with empty string", async () => {
  const content = `---
title: Test
---

# Title`;
  const doc = await parseDocument(content);

  setFrontmatter(doc, "");

  assertEquals(doc.frontmatter, null);
});

// startsWithHeader tests
Deno.test("startsWithHeader - detects header at start", () => {
  const result = startsWithHeader("# Title\nContent");
  assertExists(result);
  assertEquals(result.level, 1);
  assertEquals(result.title, "Title");
});

Deno.test("startsWithHeader - detects different header levels", () => {
  const result1 = startsWithHeader("## Title");
  assertExists(result1);
  assertEquals(result1.level, 2);

  const result2 = startsWithHeader("### Title");
  assertExists(result2);
  assertEquals(result2.level, 3);
});

Deno.test("startsWithHeader - returns null for non-header", () => {
  const result = startsWithHeader("Regular content\n# Title");
  assertEquals(result, null);
});

Deno.test("startsWithHeader - trims title whitespace", () => {
  const result = startsWithHeader("#   Title   ");
  assertExists(result);
  assertEquals(result.title, "Title");
});
