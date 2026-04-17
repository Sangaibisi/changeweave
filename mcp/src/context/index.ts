import type { GitProvider, CommitInfo, CommitDiff } from "../providers/types.js";
import type { AnalyzedCommit } from "../analysis/index.js";
import { buildTier1Context, buildFilesSummary } from "./tier1.js";
import { buildTier2Context } from "./tier2.js";
import { buildTier3Context } from "./tier3.js";
import {
  createBudget,
  consumeBudget,
  remainingBudget,
  estimateTokens,
  type TokenBudget,
} from "./token-estimator.js";
import { logger } from "../utils/logger.js";

export type ContextDepth = "summary" | "detailed" | "full";

export interface ContextResult {
  context: string;
  budget: TokenBudget;
  tiersUsed: number[];
}

/**
 * Build context with tiered depth based on token budget.
 *
 * Strategy:
 * 1. Always include Tier 1 for all commits
 * 2. If budget allows, add Tier 2 (diffs) for HIGH impact commits first, then MEDIUM
 * 3. If breaking changes detected and budget allows, add Tier 3 (full files)
 */
export async function buildContext(
  provider: GitProvider,
  owner: string,
  repo: string,
  commits: CommitInfo[],
  analyzedCommits: AnalyzedCommit[],
  depth: ContextDepth,
  tokenBudgetTotal: number,
  baseRef?: string,
  headRef?: string,
): Promise<ContextResult> {
  const budget = createBudget(tokenBudgetTotal);
  const tiersUsed: number[] = [];
  const sections: string[] = [];

  // Tier 1 — Always included
  const tier1 = buildTier1Context(commits);
  const tier1Tokens = estimateTokens(tier1);
  consumeBudget(budget, tier1Tokens);
  sections.push("## Commit Summary\n");
  sections.push(tier1);
  tiersUsed.push(1);
  logger.debug("Tier 1 context built", { tokens: tier1Tokens, commits: commits.length });

  if (depth === "summary") {
    return { context: sections.join("\n"), budget, tiersUsed };
  }

  // Tier 2 — Diff hunks for high-impact commits
  const highImpact = analyzedCommits.filter((c) => c.impact === "HIGH");
  const mediumImpact = analyzedCommits.filter((c) => c.impact === "MEDIUM");

  const commitsForDiff: AnalyzedCommit[] = [...highImpact, ...mediumImpact];
  const diffs: CommitDiff[] = [];

  for (const ac of commitsForDiff) {
    if (remainingBudget(budget) < 200) break;

    try {
      const diff = await provider.getCommitDiff(owner, repo, ac.sha);
      const diffContext = buildTier2Context([diff]);
      const diffTokens = estimateTokens(diffContext);

      if (consumeBudget(budget, diffTokens)) {
        diffs.push(diff);
      } else {
        break;
      }
    } catch (err) {
      logger.warn("Failed to fetch diff for commit", { sha: ac.sha });
    }
  }

  if (diffs.length > 0) {
    sections.push("\n## Code Changes (Diffs)\n");
    sections.push(buildTier2Context(diffs));
    tiersUsed.push(2);
    logger.debug("Tier 2 context built", { diffs: diffs.length });
  }

  if (depth === "detailed") {
    return { context: sections.join("\n"), budget, tiersUsed };
  }

  // Tier 3 — Full file context for breaking changes
  if (baseRef && headRef) {
    const breakingCommits = analyzedCommits.filter((c) => c.category === "BREAKING_CHANGE");
    const breakingFiles = new Set<string>();

    for (const bc of breakingCommits) {
      const commit = commits.find((c) => c.sha === bc.sha);
      if (commit) {
        for (const f of commit.filesChanged) {
          breakingFiles.add(f.filename);
        }
      }
    }

    if (breakingFiles.size > 0 && remainingBudget(budget) > 500) {
      const filePaths = Array.from(breakingFiles).slice(0, 5); // Max 5 files
      try {
        const tier3 = await buildTier3Context(provider, owner, repo, filePaths, baseRef, headRef);
        const tier3Tokens = estimateTokens(tier3);

        if (consumeBudget(budget, tier3Tokens)) {
          sections.push("\n## Full File Context (Breaking Changes)\n");
          sections.push(tier3);
          tiersUsed.push(3);
          logger.debug("Tier 3 context built", { files: filePaths.length });
        }
      } catch (err) {
        logger.warn("Failed to build Tier 3 context");
      }
    }
  }

  return { context: sections.join("\n"), budget, tiersUsed };
}

export { estimateTokens, createBudget, consumeBudget, remainingBudget } from "./token-estimator.js";
