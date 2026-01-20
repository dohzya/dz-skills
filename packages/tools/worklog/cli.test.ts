import { assertEquals } from "@std/assert";
import { WtError } from "./types.ts";

// WtError tests
Deno.test("WtError - creates error with code and message", () => {
  const error = new WtError("not_initialized", "Worklog not initialized");
  assertEquals(error.code, "not_initialized");
  assertEquals(error.message, "Worklog not initialized");
  assertEquals(error.name, "WtError");
});

Deno.test("WtError - toJSON returns structured error", () => {
  const error = new WtError("task_not_found", "Task 123 not found");
  const json = error.toJSON();
  assertEquals(json.error, "task_not_found");
  assertEquals(json.code, "task_not_found");
  assertEquals(json.message, "Task 123 not found");
});

Deno.test("WtError - handles different error codes", () => {
  const codes = [
    "not_initialized",
    "already_initialized",
    "task_not_found",
    "task_already_done",
    "invalid_args",
    "io_error",
  ] as const;

  for (const code of codes) {
    const error = new WtError(code, "Test message");
    assertEquals(error.code, code);
  }
});

// Integration tests would go here
// Note: These would require setting up temporary directories and testing
// the main() function with various command-line arguments. For example:
//
// Deno.test("worklog init - creates .worklog directory", async () => {
//   const tempDir = await Deno.makeTempDir();
//   const originalCwd = Deno.cwd();
//   try {
//     Deno.chdir(tempDir);
//     await main(["init"]);
//     const stat = await Deno.stat(".worklog");
//     assertEquals(stat.isDirectory, true);
//   } finally {
//     Deno.chdir(originalCwd);
//     await Deno.remove(tempDir, { recursive: true });
//   }
// });
