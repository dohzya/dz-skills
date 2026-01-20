# dz-skills

A collection of Claude Code skills for markdown manipulation and productivity.

## Installation

Add this plugin to Claude Code:

```bash
claude mcp add-skill https://github.com/dohzya/dz-skills
```

## Skills

### markdown-surgeon

Manipulate Markdown files surgically by section without loading entire content. Useful for:
- Editing large .md files
- Updating specific sections
- Using Markdown as a lightweight database

Commands: `outline`, `read`, `write`, `append`, `empty`, `remove`, `search`, `concat`, `meta`, `create`

### obsidian-journal

Create journal entries in Obsidian. Use when storing, saving, or recording information for later reference.

### rex-session

Generate structured REX (Retour d'EXpérience / Post-Mortem) from technical conversations.

### work-journal

Automatically maintain work documentation during project tasks with WORKLOG.md and CHANGES.md.

## Library

The core functionality is available as a JSR package:

```typescript
import { parseDocument } from "@dz/tools/markdown-surgeon";
```

See [packages/tools/README.md](packages/tools/README.md) for API documentation.

## Development

```bash
# Check types
deno task check

# Run tests
deno task test
```

## License

MIT
