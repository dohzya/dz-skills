import { assertEquals } from "@std/assert";
import { isValidId, sectionHash } from "./hash.ts";

Deno.test("sectionHash - generates consistent 8-char hex hash", async () => {
  const hash = await sectionHash(1, "Introduction", 0);
  assertEquals(hash.length, 8);
  assertEquals(/^[0-9a-f]{8}$/i.test(hash), true);
});

Deno.test("sectionHash - same input produces same hash", async () => {
  const hash1 = await sectionHash(2, "Getting Started", 0);
  const hash2 = await sectionHash(2, "Getting Started", 0);
  assertEquals(hash1, hash2);
});

Deno.test("sectionHash - different inputs produce different hashes", async () => {
  const hash1 = await sectionHash(1, "Title A", 0);
  const hash2 = await sectionHash(1, "Title B", 0);
  assertEquals(hash1 === hash2, false);
});

Deno.test("sectionHash - different occurrence index produces different hash", async () => {
  const hash1 = await sectionHash(1, "Introduction", 0);
  const hash2 = await sectionHash(1, "Introduction", 1);
  assertEquals(hash1 === hash2, false);
});

Deno.test("sectionHash - different level produces different hash", async () => {
  const hash1 = await sectionHash(1, "Title", 0);
  const hash2 = await sectionHash(2, "Title", 0);
  assertEquals(hash1 === hash2, false);
});

Deno.test("sectionHash - normalizes title to lowercase", async () => {
  const hash1 = await sectionHash(1, "Title", 0);
  const hash2 = await sectionHash(1, "TITLE", 0);
  assertEquals(hash1, hash2);
});

Deno.test("sectionHash - trims title whitespace", async () => {
  const hash1 = await sectionHash(1, "Title", 0);
  const hash2 = await sectionHash(1, "  Title  ", 0);
  assertEquals(hash1, hash2);
});

Deno.test("isValidId - accepts valid 8-char hex strings", () => {
  assertEquals(isValidId("abcd1234"), true);
  assertEquals(isValidId("12345678"), true);
  assertEquals(isValidId("ABCDEF00"), true);
  assertEquals(isValidId("00000000"), true);
});

Deno.test("isValidId - rejects invalid strings", () => {
  assertEquals(isValidId("abc"), false); // too short
  assertEquals(isValidId("abcd12345"), false); // too long
  assertEquals(isValidId("xyz12345"), false); // non-hex chars
  assertEquals(isValidId("abcd 123"), false); // contains space
  assertEquals(isValidId(""), false); // empty
});
