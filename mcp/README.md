# changeweave-mcp

AI-native code change analyst for intelligent changelog generation. Analyzes actual code diffs (LOC-level) — not just commit messages — to produce high-quality release notes.

## Features

- **7 MCP Tools**: analyze commits, generate changelogs, get diffs, compare refs, detect breaking changes, list/publish changelogs
- **2 MCP Resources**: project context, recent pending commits
- **Tiered Context Engine**: Smart token budget management across 3 tiers (summary → diffs → full file)
- **Diff-Aware Analysis**: Categorization and impact scoring based on actual code changes, not just commit messages
- **Breaking Change Detection**: Detects removed exports, changed signatures, altered routes, schema migrations
- **Module Mapping**: Groups file changes into logical modules/features

## Quick Start

### Prerequisites

- Node.js 18+
- GitHub Personal Access Token (PAT) with `repo` scope

### Install & Run

```bash
npx changeweave-mcp
```

### Configuration (Environment Variables)

```env
# Required
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Optional — enables list/publish changelog features
CHANGEWEAVE_API_URL=https://api.changeweave.dev
CHANGEWEAVE_API_KEY=cwk_xxxxxxxxxxxx

# Optional tuning
CONTEXT_TOKEN_BUDGET=8000
DEFAULT_DEPTH=detailed
LOG_LEVEL=info
```

### Windsurf / Cursor Configuration

Add to your MCP settings:

```json
{
  "mcpServers": {
    "changeweave": {
      "command": "npx",
      "args": ["changeweave-mcp"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `analyze_commits` | Analyze commits between two refs with tiered context depth |
| `generate_changelog` | Generate publication-ready changelog with style/audience options |
| `get_commit_diff` | Get full diff for a specific commit with categorization |
| `compare_refs` | Compare branches/tags with file and module summaries |
| `detect_breaking_changes` | Detect removed exports, changed signatures, altered routes |
| `list_changelogs` | List existing changelogs from ChangeWeave backend |
| `publish_changelog` | Create/publish changelog to ChangeWeave platform |

## Resources

| Resource | URI Pattern | Description |
|----------|-------------|-------------|
| `project_context` | `project://{owner}/{repo}/context` | Repo metadata, language, last tag |
| `recent_commits` | `commits://{owner}/{repo}/pending` | Unprocessed commits since last release |

## Tiered Context Engine

Token budget is managed intelligently across 3 tiers:

| Tier | Content | Tokens/commit | When |
|------|---------|---------------|------|
| **1** | Messages + filenames + LOC stats | ~50 | Always |
| **2** | Diff hunks | ~200-500 | HIGH/MEDIUM impact |
| **3** | Full file before/after | ~1000+ | Breaking changes only |

## Development

```bash
npm install
npm run dev      # Watch mode
npm run build    # Compile TypeScript
npm test         # Run tests
```

## License

MIT
