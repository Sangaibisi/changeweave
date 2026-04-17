import { z } from "zod";
import type { GitProvider } from "../providers/types.js";
import { analyzeCommits, type AnalysisResult } from "../analysis/index.js";
import { buildContext, type ContextDepth } from "../context/index.js";
import { logger } from "../utils/logger.js";

export const analyzeCommitsSchema = z.object({
  owner: z.string().describe("GitHub org/user"),
  repo: z.string().describe("Repository name"),
  base: z.string().describe("Base ref (tag, branch, commit SHA)"),
  head: z.string().default("HEAD").describe("Head ref (default: HEAD)"),
  depth: z
    .enum(["summary", "detailed", "full"])
    .default("detailed")
    .describe("Context depth: summary | detailed | full"),
  max_commits: z.number().default(50).describe("Max commits to analyze"),
});

export type AnalyzeCommitsInput = z.infer<typeof analyzeCommitsSchema>;

export async function analyzeCommitsTool(
  provider: GitProvider,
  input: AnalyzeCommitsInput,
  tokenBudget: number,
): Promise<string> {
  const { owner, repo, base, head, depth, max_commits } = input;

  logger.info("Analyzing commits", { owner, repo, base, head, depth });

  // Compare refs to get all commits between base and head
  const comparison = await provider.compareRefs(owner, repo, base, head);
  const commits = comparison.commits.slice(0, max_commits);

  // Enrich commits with file change info from comparison
  for (const commit of commits) {
    // Fetch individual commit details for file-level info
    try {
      const diff = await provider.getCommitDiff(owner, repo, commit.sha);
      commit.filesChanged = diff.files.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
      }));
      commit.totalAdditions = diff.totalAdditions;
      commit.totalDeletions = diff.totalDeletions;
    } catch {
      logger.warn("Failed to get details for commit", { sha: commit.sha });
    }
  }

  // Analyze commits
  const analysis = analyzeCommits(commits);

  // Build tiered context
  const contextResult = await buildContext(
    provider,
    owner,
    repo,
    commits,
    analysis.commits,
    depth as ContextDepth,
    tokenBudget,
    base,
    head,
  );

  // Format output
  const output = formatAnalysis(analysis, comparison.totalCommits, contextResult.tiersUsed, contextResult.budget.used);
  return output;
}

function formatAnalysis(
  analysis: AnalysisResult,
  totalCommitsInRange: number,
  tiersUsed: number[],
  tokensUsed: number,
): string {
  const lines: string[] = [];

  lines.push("# Commit Analysis\n");
  lines.push(`**Total commits**: ${totalCommitsInRange} (analyzed: ${analysis.summary.total})`);
  lines.push(`**LOC**: +${analysis.summary.totalAdditions}, -${analysis.summary.totalDeletions}`);
  lines.push(`**Modules affected**: ${analysis.summary.modulesAffected.join(", ") || "N/A"}`);
  lines.push(`**Critical path changes**: ${analysis.summary.hasCriticalPathChanges ? "⚠️ YES" : "No"}`);
  lines.push(`**Context tiers used**: ${tiersUsed.join(", ")} | Tokens: ~${tokensUsed}`);
  lines.push("");

  // By category
  lines.push("## By Category\n");
  for (const [cat, count] of Object.entries(analysis.summary.byCategory)) {
    lines.push(`- **${cat}**: ${count}`);
  }
  lines.push("");

  // By impact
  lines.push("## By Impact\n");
  for (const [impact, count] of Object.entries(analysis.summary.byImpact)) {
    lines.push(`- **${impact}**: ${count}`);
  }
  lines.push("");

  // Modules
  if (analysis.modules.length > 0) {
    lines.push("## Modules\n");
    for (const mod of analysis.modules) {
      lines.push(`- **${mod.name}** (${mod.files.length} files, +${mod.additions}, -${mod.deletions})`);
    }
    lines.push("");
  }

  // Breaking changes
  if (analysis.breakingChanges.length > 0) {
    lines.push("## ⚠️ Breaking Changes\n");
    for (const bc of analysis.breakingChanges) {
      lines.push(`- **[${bc.severity.toUpperCase()}]** ${bc.description}`);
      lines.push(`  File: ${bc.file}`);
      if (bc.beforeSnippet) lines.push(`  Before: \`${bc.beforeSnippet}\``);
      if (bc.afterSnippet) lines.push(`  After: \`${bc.afterSnippet}\``);
    }
    lines.push("");
  }

  // Commit list
  lines.push("## Commits\n");
  for (const c of analysis.commits) {
    const icon = c.impact === "HIGH" ? "🔴" : c.impact === "MEDIUM" ? "🟡" : "🟢";
    lines.push(`${icon} \`${c.sha.substring(0, 7)}\` **${c.category}** — ${c.message}`);
    if (c.modulesAffected.length > 0) {
      lines.push(`  Modules: ${c.modulesAffected.join(", ")}`);
    }
  }

  return lines.join("\n");
}
