import { z } from "zod";
import type { GitProvider } from "../providers/types.js";
import {
  analyzeCommits,
  clusterCommits,
  groupByPullRequests,
  type ClusteringResult,
  type PRGroupingResult,
} from "../analysis/index.js";
import { buildContext, type ContextDepth } from "../context/index.js";
import { logger } from "../utils/logger.js";

export const generateChangelogSchema = z.object({
  owner: z.string().describe("GitHub org/user"),
  repo: z.string().describe("Repository name"),
  version: z.string().describe("Semantic version (e.g., '2.1.0')"),
  base: z.string().describe("Base ref (previous release tag)"),
  head: z.string().default("HEAD").describe("Head ref (default: HEAD)"),
  style: z
    .enum(["user-friendly", "technical", "marketing"])
    .default("user-friendly")
    .describe("Changelog style"),
  audience: z
    .enum(["end-users", "developers", "stakeholders"])
    .default("end-users")
    .describe("Target audience"),
  language: z.string().default("en").describe("Output language ISO code"),
  include_contributors: z.boolean().default(true).describe("Include contributor attributions"),
  include_stats: z.boolean().default(false).describe("Include LOC/file change stats"),
});

export type GenerateChangelogInput = z.infer<typeof generateChangelogSchema>;

export async function generateChangelogTool(
  provider: GitProvider,
  input: GenerateChangelogInput,
  tokenBudget: number,
): Promise<string> {
  const { owner, repo, version, base, head, style, audience, language, include_contributors, include_stats } = input;

  logger.info("Generating changelog", { owner, repo, version, base, head });

  const comparison = await provider.compareRefs(owner, repo, base, head);
  const commits = comparison.commits;

  // Enrich commits with file info
  for (const commit of commits) {
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

  // Analysis now includes revert detection + noise filtering
  const analysis = analyzeCommits(commits);

  // PR-based grouping (primary strategy)
  let prGrouping: PRGroupingResult | null = null;
  try {
    prGrouping = await groupByPullRequests(provider, owner, repo, commits, analysis.commits);
  } catch {
    logger.warn("PR grouping failed, falling back to clustering");
  }

  // Semantic clustering for commits not covered by PRs
  const commitsToCluster = prGrouping ? prGrouping.ungrouped : analysis.commits;
  const clustering = clusterCommits(
    commits.filter((c) => commitsToCluster.some((ac) => ac.sha === c.sha)),
    commitsToCluster,
  );

  const contextResult = await buildContext(
    provider,
    owner,
    repo,
    commits,
    analysis.commits,
    "detailed" as ContextDepth,
    tokenBudget,
    base,
    head,
  );

  // Build the changelog generation prompt with full context
  const output = buildChangelogPromptOutput(
    version,
    owner,
    repo,
    analysis,
    contextResult.context,
    style,
    audience,
    language,
    include_contributors,
    include_stats,
    comparison.totalCommits,
    prGrouping,
    clustering,
  );

  return output;
}

function buildChangelogPromptOutput(
  version: string,
  owner: string,
  repo: string,
  analysis: ReturnType<typeof analyzeCommits>,
  context: string,
  style: string,
  audience: string,
  language: string,
  includeContributors: boolean,
  includeStats: boolean,
  totalCommits: number,
  prGrouping: PRGroupingResult | null,
  clustering: ClusteringResult,
): string {
  const lines: string[] = [];

  lines.push(`# Changelog Generation — ${owner}/${repo} v${version}\n`);
  lines.push(`**Style**: ${style} | **Audience**: ${audience} | **Language**: ${language}`);
  lines.push(`**Commits analyzed**: ${analysis.summary.total} / ${totalCommits}`);
  lines.push(`**LOC**: +${analysis.summary.totalAdditions}, -${analysis.summary.totalDeletions}`);

  // Preprocessing summary
  const pp = analysis.preprocessing;
  if (pp.revertPairs.length > 0 || pp.noiseCount > 0) {
    lines.push(`**Preprocessing**: ${pp.originalCount} original → ${analysis.summary.total} meaningful`);
    if (pp.revertPairs.length > 0) {
      lines.push(`  - ${pp.revertPairs.length} revert pair(s) eliminated`);
    }
    if (pp.noiseCount > 0) {
      lines.push(`  - ${pp.noiseCount} noise commit(s) filtered`);
    }
  }
  lines.push("");

  lines.push("---\n");
  lines.push("## Instructions for AI\n");
  lines.push("Use the context below to generate a polished changelog. Follow these rules:\n");

  if (style === "user-friendly") {
    lines.push("- Write for non-technical users");
    lines.push('- Focus on benefits ("You can now..." instead of "Added feature...")');
    lines.push("- Avoid jargon (API, refactor, endpoint, etc.)");
    lines.push("- Use emojis sparingly for visual hierarchy");
  } else if (style === "technical") {
    lines.push("- Write for developers");
    lines.push("- Include technical details (file paths, function names)");
    lines.push("- Note breaking changes with migration steps");
    lines.push("- Reference commit SHAs where relevant");
  } else if (style === "marketing") {
    lines.push("- Write for product announcements");
    lines.push("- Lead with the most exciting features");
    lines.push("- Use compelling language");
    lines.push("- Focus on business value");
  }

  lines.push("- Group changes by category (Features, Fixes, Improvements, Breaking Changes)");
  lines.push("- IMPORTANT: When multiple commits form a logical group (PR or cluster), describe them as ONE unified change, not separate bullet points");
  lines.push("- Max 2 sentences per change");
  lines.push("- Output in Markdown format");
  if (language !== "en") {
    lines.push(`- Write the changelog in ${language}`);
  }
  lines.push("");

  // PR-Based Groups (highest signal)
  if (prGrouping && prGrouping.groups.length > 0) {
    lines.push("---\n");
    lines.push("## Pull Request Groups\n");
    lines.push("Each PR represents one logical change. Use the PR title as the primary description.\n");
    for (const group of prGrouping.groups) {
      lines.push(`### PR #${group.pr.number}: ${group.pr.title}`);
      lines.push(`- **Category**: ${group.category}`);
      lines.push(`- **Author**: ${group.pr.authorLogin}`);
      lines.push(`- **Merged**: ${group.pr.mergedAt}`);
      if (group.pr.labels.length > 0) {
        lines.push(`- **Labels**: ${group.pr.labels.join(", ")}`);
      }
      if (group.pr.body) {
        const bodyPreview = group.pr.body.substring(0, 300);
        lines.push(`- **Description**: ${bodyPreview}${group.pr.body.length > 300 ? "..." : ""}`);
      }
      lines.push(`- **Commits** (${group.commits.length}):`);
      for (const c of group.commits) {
        lines.push(`  - ${c.sha.substring(0, 7)} ${c.message}`);
      }
      lines.push("");
    }
  }

  // Commit Clusters (for commits not in PRs)
  if (clustering.clusters.length > 0) {
    lines.push("---\n");
    lines.push("## Commit Clusters\n");
    lines.push("These commits were grouped by file overlap, author, and timing. Treat each cluster as ONE change.\n");
    for (const cluster of clustering.clusters) {
      lines.push(`### ${cluster.label}`);
      lines.push(`- **Category**: ${cluster.category}`);
      lines.push(`- **Modules**: ${cluster.modules.join(", ")}`);
      lines.push(`- **LOC**: +${cluster.additions}, -${cluster.deletions}`);
      lines.push(`- **Commits**:`);
      for (const c of cluster.commits) {
        lines.push(`  - ${c.sha.substring(0, 7)} ${c.message}`);
      }
      lines.push("");
    }
  }

  // Unclustered commits
  if (clustering.unclustered.length > 0) {
    lines.push("---\n");
    lines.push("## Individual Changes\n");
    for (const c of clustering.unclustered) {
      lines.push(`- **[${c.category}]** ${c.message} (${c.sha.substring(0, 7)}, ${c.impact} impact)`);
    }
    lines.push("");
  }

  // Breaking changes warning
  if (analysis.breakingChanges.length > 0) {
    lines.push("## ⚠️ Detected Breaking Changes\n");
    for (const bc of analysis.breakingChanges) {
      lines.push(`- **[${bc.severity}]** ${bc.description} (${bc.file})`);
      if (bc.beforeSnippet) lines.push(`  Before: \`${bc.beforeSnippet}\``);
      if (bc.afterSnippet) lines.push(`  After: \`${bc.afterSnippet}\``);
    }
    lines.push("\nPlease include migration instructions for each breaking change.\n");
  }

  // Context
  lines.push("---\n");
  lines.push("## Code Change Context\n");
  lines.push(context);

  // Contributors
  if (includeContributors) {
    const contributors = new Set(analysis.commits.map((c) => c.authorName));
    lines.push("\n## Contributors\n");
    for (const name of contributors) {
      lines.push(`- ${name}`);
    }
  }

  // Stats
  if (includeStats) {
    lines.push("\n## Statistics\n");
    lines.push(`- **Commits**: ${analysis.summary.total}`);
    lines.push(`- **Files changed**: ${analysis.modules.reduce((s, m) => s + m.files.length, 0)}`);
    lines.push(`- **Lines added**: ${analysis.summary.totalAdditions}`);
    lines.push(`- **Lines deleted**: ${analysis.summary.totalDeletions}`);
    lines.push(`- **Modules affected**: ${analysis.summary.modulesAffected.join(", ")}`);
  }

  return lines.join("\n");
}
