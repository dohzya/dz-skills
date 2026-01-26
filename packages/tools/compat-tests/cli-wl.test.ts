import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";

const CLI_PATH = new URL("../worklog/cli.ts", import.meta.url).pathname;

async function runCli(
  args: string[],
  cwd?: string,
): Promise<{
  stdout: string;
  stderr: string;
  code: number;
}> {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-read", "--allow-write", CLI_PATH, ...args],
    stdout: "piped",
    stderr: "piped",
    cwd,
  });

  const { stdout, stderr, code } = await cmd.output();
  return {
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
    code,
  };
}

function createTestWorkspace(): string {
  const tmpDir = Deno.makeTempDirSync();
  return tmpDir;
}

Deno.test("wl: init command creates .worklog directory", async () => {
  const workspace = createTestWorkspace();
  try {
    const result = await runCli(["init"], workspace);
    assertEquals(result.code, 0);

    const worklogDir = join(workspace, ".worklog");
    const stat = await Deno.stat(worklogDir);
    assertEquals(stat.isDirectory, true);

    const tasksDir = join(worklogDir, "tasks");
    const tasksStat = await Deno.stat(tasksDir);
    assertEquals(tasksStat.isDirectory, true);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: init --json outputs valid JSON", async () => {
  const workspace = createTestWorkspace();
  try {
    const result = await runCli(["init", "--json"], workspace);
    assertEquals(result.code, 0);
    const json = JSON.parse(result.stdout);
    assertEquals(typeof json.status, "string");
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: add command creates task", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const result = await runCli(["add", "--desc", "Test task"], workspace);
    assertEquals(result.code, 0);
    assertEquals(/^\d{6}[a-z]$/.test(result.stdout.trim()), true);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: add --json outputs task ID", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const result = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    assertEquals(result.code, 0);
    const json = JSON.parse(result.stdout);
    assertEquals(typeof json.id, "string");
    assertEquals(/^\d{6}[a-z]$/.test(json.id), true);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: trace command logs entry", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    const result = await runCli(["trace", id, "Test message"], workspace);
    assertEquals(result.code, 0);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: trace --json outputs status", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    const result = await runCli(
      ["trace", id, "Test message", "--json"],
      workspace,
    );
    assertEquals(result.code, 0);
    const json = JSON.parse(result.stdout);
    assertEquals(typeof json.status, "string");
    assertEquals(["ok", "checkpoint_recommended"].includes(json.status), true);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: trace --timestamp accepts custom timestamp", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    const result = await runCli(
      ["trace", id, "Test", "-t", "T10:30"],
      workspace,
    );
    assertEquals(result.code, 0);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: trace --force works on completed tasks", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["done", id, "Done", "Learned"], workspace);

    const result = await runCli(
      ["trace", id, "After done", "-f"],
      workspace,
    );
    assertEquals(result.code, 0);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: logs command shows task context", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry 1"], workspace);

    const result = await runCli(["logs", id], workspace);
    assertEquals(result.code, 0);
    assertStringIncludes(result.stdout, "Test task");
    assertStringIncludes(result.stdout, "Entry 1");
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: logs --json outputs valid JSON", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);

    const result = await runCli(["logs", id, "--json"], workspace);
    assertEquals(result.code, 0);
    const json = JSON.parse(result.stdout);
    assertEquals(json.task, id);
    assertEquals(json.desc, "Test task");
    assertEquals(json.status, "active");
    assertEquals(Array.isArray(json.entries_since_checkpoint), true);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: checkpoint command creates checkpoint", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);

    const result = await runCli(
      ["checkpoint", id, "Changes made", "Things learned"],
      workspace,
    );
    assertEquals(result.code, 0);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: checkpoint --json outputs valid JSON", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);

    const result = await runCli(
      ["checkpoint", id, "Changes", "Learnings", "--json"],
      workspace,
    );
    assertEquals(result.code, 0);
    const json = JSON.parse(result.stdout);
    assertEquals(typeof json, "object");
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: checkpoint --force works on completed tasks", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);
    await runCli(["done", id, "Done", "Learned"], workspace);
    await runCli(["trace", id, "After done", "-f"], workspace);

    const result = await runCli(
      ["checkpoint", id, "More changes", "More learnings", "-f"],
      workspace,
    );
    assertEquals(result.code, 0);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: checkpoint --timestamp accepts custom timestamp", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);

    const result = await runCli(
      ["checkpoint", id, "Changes", "Learnings", "-t", "T10:30"],
      workspace,
    );
    assertEquals(result.code, 0);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: done command completes task", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);

    const result = await runCli(
      ["done", id, "Final changes", "Final learnings"],
      workspace,
    );
    assertEquals(result.code, 0);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: done --json outputs valid JSON", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);

    const result = await runCli(
      ["done", id, "Changes", "Learnings", "--json"],
      workspace,
    );
    assertEquals(result.code, 0);
    const json = JSON.parse(result.stdout);
    assertEquals(typeof json, "object");
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: done --timestamp accepts custom timestamp", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Test task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);

    const result = await runCli(
      ["done", id, "Changes", "Learnings", "-t", "T11:30"],
      workspace,
    );
    assertEquals(result.code, 0);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: list command shows active tasks", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    await runCli(["add", "--desc", "Task 1"], workspace);
    await runCli(["add", "--desc", "Task 2"], workspace);

    const result = await runCli(["list"], workspace);
    assertEquals(result.code, 0);
    assertStringIncludes(result.stdout, "Task 1");
    assertStringIncludes(result.stdout, "Task 2");
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: list --all includes completed tasks", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);
    await runCli(["done", id, "Done", "Learned"], workspace);

    const result = await runCli(["list", "--all"], workspace);
    assertEquals(result.code, 0);
    assertStringIncludes(result.stdout, "Task");
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: list --json outputs valid JSON", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    await runCli(["add", "--desc", "Task"], workspace);

    const result = await runCli(["list", "--json"], workspace);
    assertEquals(result.code, 0);
    const json = JSON.parse(result.stdout);
    assertEquals(Array.isArray(json.tasks), true);
    if (json.tasks.length > 0) {
      assertEquals(typeof json.tasks[0].id, "string");
      assertEquals(typeof json.tasks[0].desc, "string");
      assertEquals(typeof json.tasks[0].status, "string");
      assertEquals(typeof json.tasks[0].created, "string");
    }
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: summary command aggregates tasks", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);
    await runCli(["checkpoint", id, "Changes", "Learnings"], workspace);

    const result = await runCli(["summary"], workspace);
    assertEquals(result.code, 0);
    assertStringIncludes(result.stdout, "Task");
    assertStringIncludes(result.stdout, "Changes");
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: summary --since filters by date", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);

    const result = await runCli(
      ["summary", "--since", "2026-01-01"],
      workspace,
    );
    assertEquals(result.code, 0);
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: summary --json outputs valid JSON", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);
    await runCli(["checkpoint", id, "Changes", "Learnings"], workspace);

    const result = await runCli(["summary", "--json"], workspace);
    assertEquals(result.code, 0);
    const json = JSON.parse(result.stdout);
    assertEquals(Array.isArray(json.tasks), true);
    if (json.tasks.length > 0) {
      assertEquals(typeof json.tasks[0].id, "string");
      assertEquals(typeof json.tasks[0].desc, "string");
      assertEquals(typeof json.tasks[0].status, "string");
      assertEquals(Array.isArray(json.tasks[0].checkpoints), true);
      assertEquals(Array.isArray(json.tasks[0].entries), true);
    }
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: import -p PATH imports from path", async () => {
  const workspace1 = createTestWorkspace();
  const workspace2 = createTestWorkspace();
  try {
    await runCli(["init"], workspace1);
    await runCli(["add", "--desc", "Task"], workspace1);

    await runCli(["init"], workspace2);

    const worklog1 = join(workspace1, ".worklog");
    const result = await runCli(["import", "-p", worklog1], workspace2);
    assertEquals(result.code, 0);
  } finally {
    Deno.removeSync(workspace1, { recursive: true });
    Deno.removeSync(workspace2, { recursive: true });
  }
});

Deno.test("wl: import --json outputs valid JSON", async () => {
  const workspace1 = createTestWorkspace();
  const workspace2 = createTestWorkspace();
  try {
    await runCli(["init"], workspace1);
    await runCli(["add", "--desc", "Task"], workspace1);

    await runCli(["init"], workspace2);

    const worklog1 = join(workspace1, ".worklog");
    const result = await runCli(
      ["import", "-p", worklog1, "--json"],
      workspace2,
    );
    assertEquals(result.code, 0);
    const json = JSON.parse(result.stdout);
    assertEquals(typeof json.imported, "number");
    assertEquals(typeof json.merged, "number");
    assertEquals(typeof json.skipped, "number");
    assertEquals(Array.isArray(json.tasks), true);
  } finally {
    Deno.removeSync(workspace1, { recursive: true });
    Deno.removeSync(workspace2, { recursive: true });
  }
});

Deno.test("wl: import --rm removes imported tasks", async () => {
  const workspace1 = createTestWorkspace();
  const workspace2 = createTestWorkspace();
  try {
    await runCli(["init"], workspace1);
    const addResult = await runCli(
      ["add", "--desc", "Task", "--json"],
      workspace1,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["init"], workspace2);

    const worklog1 = join(workspace1, ".worklog");
    const result = await runCli(
      ["import", "-p", worklog1, "--rm"],
      workspace2,
    );
    assertEquals(result.code, 0);

    const taskFile = join(workspace1, ".worklog", "tasks", `${id}.md`);
    const exists = await Deno.stat(taskFile).then(() => true).catch(() =>
      false
    );
    assertEquals(exists, false);
  } finally {
    Deno.removeSync(workspace1, { recursive: true });
    Deno.removeSync(workspace2, { recursive: true });
  }
});

Deno.test("wl: import -b BRANCH accepts branch option", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const result = await runCli(["import", "-b", "nonexistent"], workspace);
    assertEquals(result.code !== 0, true);
    assertStringIncludes(result.stderr, "error");
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: error on task_not_found", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const result = await runCli(["trace", "invalid-id", "Message"], workspace);
    assertEquals(result.code !== 0, true);
    assertStringIncludes(result.stderr, "error");
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});

Deno.test("wl: error on task_already_done without force", async () => {
  const workspace = createTestWorkspace();
  try {
    await runCli(["init"], workspace);

    const addResult = await runCli(
      ["add", "--desc", "Task", "--json"],
      workspace,
    );
    const { id } = JSON.parse(addResult.stdout);

    await runCli(["trace", id, "Entry"], workspace);
    await runCli(["done", id, "Done", "Learned"], workspace);

    const result = await runCli(["trace", id, "After done"], workspace);
    assertEquals(result.code !== 0, true);
    assertStringIncludes(result.stderr, "error");
  } finally {
    Deno.removeSync(workspace, { recursive: true });
  }
});
