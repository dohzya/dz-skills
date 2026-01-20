import { assertEquals, assertMatch } from "@std/assert";
import { expandMagic } from "./magic.ts";

// DateTime expansions
Deno.test("expandMagic - expands {datetime} to ISO format with timezone", () => {
  const result = expandMagic("Created at {datetime}");
  // Match ISO 8601 format: YYYY-MM-DDTHH:MM:SS+HH:MM or -HH:MM
  assertMatch(
    result,
    /Created at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/,
  );
});

Deno.test("expandMagic - expands {dt} as shorthand for {datetime}", () => {
  const result = expandMagic("Created at {dt}");
  assertMatch(
    result,
    /Created at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/,
  );
});

Deno.test("expandMagic - expands {datetime:short} to short format", () => {
  const result = expandMagic("Created at {datetime:short}");
  // Match: YYYY-MM-DD HH:MM
  assertMatch(result, /Created at \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
});

Deno.test("expandMagic - expands {dt:short} as shorthand", () => {
  const result = expandMagic("Created at {dt:short}");
  assertMatch(result, /Created at \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
});

Deno.test("expandMagic - expands {date} to date only", () => {
  const result = expandMagic("Date: {date}");
  // Match: YYYY-MM-DD
  assertMatch(result, /Date: \d{4}-\d{2}-\d{2}/);
});

Deno.test("expandMagic - expands {time} to time only", () => {
  const result = expandMagic("Time: {time}");
  // Match: HH:MM:SS
  assertMatch(result, /Time: \d{2}:\d{2}:\d{2}/);
});

// Meta expansions
Deno.test("expandMagic - expands {meta:key} from frontmatter", () => {
  const meta = { title: "My Document", author: "John Doe" };
  const result = expandMagic("Title: {meta:title}", meta);
  assertEquals(result, "Title: My Document");
});

Deno.test("expandMagic - expands nested {meta:key} from frontmatter", () => {
  const meta = { author: { name: "John Doe", email: "john@example.com" } };
  const result = expandMagic("Author: {meta:author.name}", meta);
  assertEquals(result, "Author: John Doe");
});

Deno.test("expandMagic - returns empty string for missing meta key", () => {
  const meta = { title: "My Document" };
  const result = expandMagic("Author: {meta:author}", meta);
  assertEquals(result, "Author: ");
});

Deno.test("expandMagic - handles missing meta object", () => {
  const result = expandMagic("Author: {meta:author}");
  assertEquals(result, "Author: {meta:author}");
});

Deno.test("expandMagic - expands multiple expressions", () => {
  const meta = { title: "My Document" };
  const result = expandMagic("{meta:title} created on {date}", meta);
  assertMatch(result, /My Document created on \d{4}-\d{2}-\d{2}/);
});

Deno.test("expandMagic - leaves unknown expressions unchanged", () => {
  const result = expandMagic("This {unknown} expression");
  assertEquals(result, "This {unknown} expression");
});

Deno.test("expandMagic - handles empty string", () => {
  const result = expandMagic("");
  assertEquals(result, "");
});

Deno.test("expandMagic - handles string without expressions", () => {
  const result = expandMagic("No expressions here");
  assertEquals(result, "No expressions here");
});

Deno.test("expandMagic - handles nested braces", () => {
  // Note: nested braces are not currently supported - the regex will match the outer braces
  // This test documents the current behavior rather than the ideal behavior
  const result = expandMagic("Code: { {date} }");
  assertEquals(result, "Code: { {date} }"); // Expression not expanded due to nested braces
});

Deno.test("expandMagic - trims whitespace in expressions", () => {
  const result = expandMagic("Date: { date }");
  assertMatch(result, /Date: \d{4}-\d{2}-\d{2}/);
});

Deno.test("expandMagic - expands array values from meta", () => {
  const meta = { tags: ["typescript", "deno"] };
  const result = expandMagic("Tags: {meta:tags}", meta);
  assertEquals(result.includes("typescript"), true);
  assertEquals(result.includes("deno"), true);
});

Deno.test("expandMagic - expands number values from meta", () => {
  const meta = { version: 1.5 };
  const result = expandMagic("Version: {meta:version}", meta);
  assertEquals(result, "Version: 1.5");
});

Deno.test("expandMagic - expands boolean values from meta", () => {
  const meta = { published: true };
  const result = expandMagic("Published: {meta:published}", meta);
  assertEquals(result, "Published: true");
});
