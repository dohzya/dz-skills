import { assertEquals } from "@std/assert";
import {
  deleteNestedValue,
  formatValue,
  getNestedValue,
  parseFrontmatter,
  setNestedValue,
  stringifyFrontmatter,
} from "./yaml.ts";

// getNestedValue tests
Deno.test("getNestedValue - gets simple property", () => {
  const obj = { name: "John", age: 30 };
  assertEquals(getNestedValue(obj, "name"), "John");
  assertEquals(getNestedValue(obj, "age"), 30);
});

Deno.test("getNestedValue - gets nested property", () => {
  const obj = { author: { name: "John", email: "john@example.com" } };
  assertEquals(getNestedValue(obj, "author.name"), "John");
  assertEquals(getNestedValue(obj, "author.email"), "john@example.com");
});

Deno.test("getNestedValue - gets array element", () => {
  const obj = { tags: ["typescript", "deno", "test"] };
  assertEquals(getNestedValue(obj, "tags.0"), "typescript");
  assertEquals(getNestedValue(obj, "tags.2"), "test");
});

Deno.test("getNestedValue - returns undefined for missing property", () => {
  const obj = { name: "John" };
  assertEquals(getNestedValue(obj, "missing"), undefined);
  assertEquals(getNestedValue(obj, "author.name"), undefined);
});

Deno.test("getNestedValue - handles null/undefined", () => {
  assertEquals(getNestedValue(null, "name"), undefined);
  assertEquals(getNestedValue(undefined, "name"), undefined);
});

// setNestedValue tests
Deno.test("setNestedValue - sets simple property", () => {
  const obj = {};
  setNestedValue(obj, "name", "John");
  assertEquals(obj, { name: "John" });
});

Deno.test("setNestedValue - sets nested property", () => {
  const obj = {};
  setNestedValue(obj, "author.name", "John");
  assertEquals(obj, { author: { name: "John" } });
});

Deno.test("setNestedValue - creates intermediate objects", () => {
  const obj = {};
  setNestedValue(obj, "a.b.c", "value");
  assertEquals(obj, { a: { b: { c: "value" } } });
});

Deno.test("setNestedValue - creates array when next part is numeric", () => {
  const obj: Record<string, unknown> = {};
  setNestedValue(obj, "tags.0", "typescript");
  assertEquals(Array.isArray(obj.tags), true);
  assertEquals(obj.tags, ["typescript"]);
});

Deno.test("setNestedValue - overwrites existing value", () => {
  const obj = { name: "John" };
  setNestedValue(obj, "name", "Jane");
  assertEquals(obj, { name: "Jane" });
});

// deleteNestedValue tests
Deno.test("deleteNestedValue - deletes simple property", () => {
  const obj: Record<string, unknown> = { name: "John", age: 30 };
  const result = deleteNestedValue(obj, "name");
  assertEquals(result, true);
  assertEquals(obj, { age: 30 });
});

Deno.test("deleteNestedValue - deletes nested property", () => {
  const obj: Record<string, unknown> = {
    author: { name: "John", email: "john@example.com" },
  };
  const result = deleteNestedValue(obj, "author.name");
  assertEquals(result, true);
  assertEquals(obj, { author: { email: "john@example.com" } });
});

Deno.test("deleteNestedValue - returns false for missing property", () => {
  const obj = { name: "John" };
  const result = deleteNestedValue(obj, "missing");
  assertEquals(result, false);
});

Deno.test("deleteNestedValue - returns false for missing nested property", () => {
  const obj = { name: "John" };
  const result = deleteNestedValue(obj, "author.name");
  assertEquals(result, false);
});

// parseFrontmatter tests
Deno.test("parseFrontmatter - parses valid YAML", () => {
  const yaml = "title: Test\nauthor: John";
  const result = parseFrontmatter(yaml);
  assertEquals(result, { title: "Test", author: "John" });
});

Deno.test("parseFrontmatter - returns empty object for empty string", () => {
  const result = parseFrontmatter("");
  assertEquals(result, {});
});

Deno.test("parseFrontmatter - returns empty object for whitespace", () => {
  const result = parseFrontmatter("   \n  ");
  assertEquals(result, {});
});

Deno.test("parseFrontmatter - returns empty object for invalid YAML", () => {
  const result = parseFrontmatter("invalid: yaml: content:");
  assertEquals(result, {});
});

Deno.test("parseFrontmatter - parses nested objects", () => {
  const yaml = "author:\n  name: John\n  email: john@example.com";
  const result = parseFrontmatter(yaml);
  assertEquals(result, { author: { name: "John", email: "john@example.com" } });
});

Deno.test("parseFrontmatter - parses arrays", () => {
  const yaml = "tags:\n  - typescript\n  - deno";
  const result = parseFrontmatter(yaml);
  assertEquals(result, { tags: ["typescript", "deno"] });
});

// stringifyFrontmatter tests
Deno.test("stringifyFrontmatter - stringifies simple object", () => {
  const obj = { title: "Test", author: "John" };
  const result = stringifyFrontmatter(obj);
  assertEquals(result.includes("title: Test"), true);
  assertEquals(result.includes("author: John"), true);
});

Deno.test("stringifyFrontmatter - returns empty string for empty object", () => {
  const result = stringifyFrontmatter({});
  assertEquals(result, "");
});

Deno.test("stringifyFrontmatter - stringifies nested objects", () => {
  const obj = { author: { name: "John", email: "john@example.com" } };
  const result = stringifyFrontmatter(obj);
  assertEquals(result.includes("author:"), true);
  assertEquals(result.includes("name: John"), true);
});

Deno.test("stringifyFrontmatter - stringifies arrays", () => {
  const obj = { tags: ["typescript", "deno"] };
  const result = stringifyFrontmatter(obj);
  assertEquals(result.includes("tags:"), true);
  assertEquals(result.includes("- typescript"), true);
});

// formatValue tests
Deno.test("formatValue - formats string", () => {
  assertEquals(formatValue("hello"), "hello");
});

Deno.test("formatValue - formats number", () => {
  assertEquals(formatValue(42), "42");
  assertEquals(formatValue(3.14), "3.14");
});

Deno.test("formatValue - formats boolean", () => {
  assertEquals(formatValue(true), "true");
  assertEquals(formatValue(false), "false");
});

Deno.test("formatValue - formats null/undefined as empty string", () => {
  assertEquals(formatValue(null), "");
  assertEquals(formatValue(undefined), "");
});

Deno.test("formatValue - formats array as YAML", () => {
  const result = formatValue(["a", "b", "c"]);
  assertEquals(result.includes("- a"), true);
  assertEquals(result.includes("- b"), true);
});

Deno.test("formatValue - formats object as YAML", () => {
  const result = formatValue({ name: "John", age: 30 });
  assertEquals(result.includes("name: John"), true);
  assertEquals(result.includes("age: 30"), true);
});
