import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "./utils/config.js";
import type { GitProvider } from "./providers/types.js";
import { createProvider } from "./providers/index.js";
import type { ChangeWeaveClient } from "./client/index.js";
import { logger } from "./utils/logger.js";

// Tools
import {
  analyzeCommitsTool,
  analyzeCommitsSchema,
  generateChangelogTool,
  generateChangelogSchema,
  getCommitDiffTool,
  getCommitDiffSchema,
  compareRefsTool,
  compareRefsSchema,
  detectBreakingTool,
  detectBreakingSchema,
  listChangelogsTool,
  listChangelogsSchema,
  publishChangelogTool,
  publishChangelogSchema,
} from "./tools/index.js";

// Resources
import {
  getProjectContext,
  formatProjectContext,
  getRecentCommits,
  formatRecentCommits,
  getLatestChangelog,
  formatLatestChangelog,
} from "./resources/index.js";

export function createMcpServer(
  config: Config,
  defaultProvider: GitProvider | null,
  client: ChangeWeaveClient,
): McpServer {
  const server = new McpServer({
    name: "changeweave-mcp",
    version: "0.1.0",
  });

  const tokenBudget = config.context.tokenBudget;

  /**
   * Resolve provider: use per-request token if provided, otherwise fall back to default.
   * This allows the backend to pass the user's OAuth token per-request.
   */
  function resolveProvider(token?: string): GitProvider {
    if (token) {
      return createProvider("github", token);
    }
    if (defaultProvider) {
      return defaultProvider;
    }
    throw new Error("No GitHub token provided. Pass 'token' parameter or set GITHUB_TOKEN env.");
  }

  // ─── Tools ────────────────────────────────────────────────

  server.tool(
    "analyze_commits",
    "Analyze commits between two refs with full diff context, categorization, and impact scoring. Returns detailed analysis including LOC stats, module mapping, and breaking change detection.",
    {
      owner: z.string().describe("GitHub org/user"),
      repo: z.string().describe("Repository name"),
      base: z.string().describe("Base ref (tag, branch, commit SHA)"),
      head: z.string().default("HEAD").describe("Head ref"),
      depth: z.enum(["summary", "detailed", "full"]).default("detailed").describe("Context depth"),
      max_commits: z.number().default(50).describe("Max commits to analyze"),
      token: z.string().optional().describe("GitHub OAuth token (per-request, overrides default)"),
    },
    async (args) => {
      try {
        const result = await analyzeCommitsTool(resolveProvider(args.token), args, tokenBudget);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (err) {
        logger.error("analyze_commits failed", { error: (err as Error).message });
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    "generate_changelog",
    "Generate a complete, publication-ready changelog from code changes between two refs. Provides rich context including diffs, categorization, and formatting instructions for different audiences and styles.",
    {
      owner: z.string().describe("GitHub org/user"),
      repo: z.string().describe("Repository name"),
      version: z.string().describe("Semantic version (e.g., '2.1.0')"),
      base: z.string().describe("Base ref (previous release tag)"),
      head: z.string().default("HEAD").describe("Head ref"),
      style: z.enum(["user-friendly", "technical", "marketing"]).default("user-friendly").describe("Changelog style"),
      audience: z.enum(["end-users", "developers", "stakeholders"]).default("end-users").describe("Target audience"),
      language: z.string().default("en").describe("Output language ISO code"),
      include_contributors: z.boolean().default(true).describe("Include contributor attributions"),
      include_stats: z.boolean().default(false).describe("Include LOC/file change stats"),
      token: z.string().optional().describe("GitHub OAuth token (per-request, overrides default)"),
    },
    async (args) => {
      try {
        const result = await generateChangelogTool(resolveProvider(args.token), args, tokenBudget);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (err) {
        logger.error("generate_changelog failed", { error: (err as Error).message });
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    "get_commit_diff",
    "Get the full diff for a specific commit with file-level changes, hunks, categorization, and impact assessment.",
    {
      owner: z.string().describe("GitHub org/user"),
      repo: z.string().describe("Repository name"),
      sha: z.string().describe("Commit SHA"),
      context_lines: z.number().default(3).describe("Lines of context around changes"),
      token: z.string().optional().describe("GitHub OAuth token (per-request, overrides default)"),
    },
    async (args) => {
      try {
        const result = await getCommitDiffTool(resolveProvider(args.token), args);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (err) {
        logger.error("get_commit_diff failed", { error: (err as Error).message });
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    "compare_refs",
    "Compare two branches, tags, or commits to see all changes including file list, module mapping, and LOC statistics.",
    {
      owner: z.string().describe("GitHub org/user"),
      repo: z.string().describe("Repository name"),
      base: z.string().describe("Base ref"),
      head: z.string().describe("Head ref"),
      include_diffs: z.boolean().default(false).describe("Include file diffs"),
      file_filter: z.string().optional().describe("Glob pattern to filter files"),
      token: z.string().optional().describe("GitHub OAuth token (per-request, overrides default)"),
    },
    async (args) => {
      try {
        const result = await compareRefsTool(resolveProvider(args.token), args);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (err) {
        logger.error("compare_refs failed", { error: (err as Error).message });
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    "detect_breaking_changes",
    "Analyze diffs between two refs to detect potential breaking changes: removed exports, changed function signatures, altered API routes, and schema migrations.",
    {
      owner: z.string().describe("GitHub org/user"),
      repo: z.string().describe("Repository name"),
      base: z.string().describe("Base ref"),
      head: z.string().describe("Head ref"),
      token: z.string().optional().describe("GitHub OAuth token (per-request, overrides default)"),
    },
    async (args) => {
      try {
        const result = await detectBreakingTool(resolveProvider(args.token), args);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (err) {
        logger.error("detect_breaking_changes failed", { error: (err as Error).message });
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    "list_changelogs",
    "List existing changelogs from the ChangeWeave platform for a repository.",
    {
      repo_id: z.string().describe("ChangeWeave repository ID"),
      status: z.enum(["draft", "published", "all"]).default("all").describe("Filter by status"),
      limit: z.number().default(10).describe("Max results"),
    },
    async (args) => {
      try {
        const result = await listChangelogsTool(client, args);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (err) {
        logger.error("list_changelogs failed", { error: (err as Error).message });
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    "publish_changelog",
    "Create and optionally publish a changelog to the ChangeWeave platform.",
    {
      repo_id: z.string().describe("ChangeWeave repository ID"),
      version: z.string().describe("Semantic version"),
      title: z.string().describe("Changelog title"),
      content: z.string().describe("Markdown content"),
      publish_immediately: z.boolean().default(false).describe("Publish immediately or save as draft"),
    },
    async (args) => {
      try {
        const result = await publishChangelogTool(client, args);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (err) {
        logger.error("publish_changelog failed", { error: (err as Error).message });
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  // ─── Resources ────────────────────────────────────────────

  server.resource(
    "project_context",
    new ResourceTemplate("project://{owner}/{repo}/context", { list: undefined }),
    { description: "Project metadata, language, default branch, last tag, and activity summary." },
    async (uri: URL, variables: Record<string, string | string[]>) => {
      const owner = typeof variables.owner === "string" ? variables.owner : variables.owner?.[0];
      const repo = typeof variables.repo === "string" ? variables.repo : variables.repo?.[0];
      if (!owner || !repo) {
        return { contents: [{ uri: uri.href, mimeType: "text/plain", text: "Invalid URI: expected project://{owner}/{repo}/context" }] };
      }
      try {
        const ctx = await getProjectContext(resolveProvider(), owner, repo);
        return { contents: [{ uri: uri.href, mimeType: "text/plain", text: formatProjectContext(ctx) }] };
      } catch (err) {
        return { contents: [{ uri: uri.href, mimeType: "text/plain", text: `Error: ${(err as Error).message}` }] };
      }
    },
  );

  server.resource(
    "recent_commits",
    new ResourceTemplate("commits://{owner}/{repo}/pending", { list: undefined }),
    { description: "Recent unprocessed commits since the last release tag." },
    async (uri: URL, variables: Record<string, string | string[]>) => {
      const owner = typeof variables.owner === "string" ? variables.owner : variables.owner?.[0];
      const repo = typeof variables.repo === "string" ? variables.repo : variables.repo?.[0];
      if (!owner || !repo) {
        return { contents: [{ uri: uri.href, mimeType: "text/plain", text: "Invalid URI" }] };
      }
      try {
        const summary = await getRecentCommits(resolveProvider(), owner, repo);
        return { contents: [{ uri: uri.href, mimeType: "text/plain", text: formatRecentCommits(summary) }] };
      } catch (err) {
        return { contents: [{ uri: uri.href, mimeType: "text/plain", text: `Error: ${(err as Error).message}` }] };
      }
    },
  );

  logger.info("MCP server created with 7 tools and 2 resources");
  return server;
}
