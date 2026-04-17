import type { GitProvider, PullRequestInfo, CommitInfo } from "../providers/types.js";
import type { AnalyzedCommit } from "./index.js";
import { logger } from "../utils/logger.js";

export interface PRGroup {
  pr: PullRequestInfo;
  /** Analyzed commits that belong to this PR */
  commits: AnalyzedCommit[];
  /** Dominant category derived from commit analysis */
  category: string;
}

export interface PRGroupingResult {
  /** Commits grouped under PRs */
  groups: PRGroup[];
  /** Commits not associated with any PR (direct pushes to main) */
  ungrouped: AnalyzedCommit[];
}

/**
 * Group commits by their associated merged Pull Requests.
 *
 * Strategy:
 * 1. Fetch merged PRs for the repo (within the release timeframe)
 * 2. For each PR, fetch its commit SHAs
 * 3. Map analyzed commits to their PR
 * 4. Commits not in any PR remain ungrouped
 *
 * This is the most reliable grouping method because:
 * - 1 PR = 1 logical feature/fix (by convention)
 * - PR title/body = human-written feature description
 * - Labels provide extra categorization signal
 */
export async function groupByPullRequests(
  provider: GitProvider,
  owner: string,
  repo: string,
  commits: CommitInfo[],
  analyzed: AnalyzedCommit[],
): Promise<PRGroupingResult> {
  if (analyzed.length === 0) {
    return { groups: [], ungrouped: [] };
  }

  // Determine time range from commits
  const dates = commits.map((c) => c.date).filter(Boolean).sort();
  const since = dates.length > 0 ? dates[0] : undefined;

  let prs: PullRequestInfo[];
  try {
    prs = await provider.listMergedPullRequests(owner, repo, {
      since,
      perPage: 100,
    });
  } catch (err) {
    logger.warn("Failed to fetch PRs, skipping PR grouping");
    return { groups: [], ungrouped: analyzed };
  }

  if (prs.length === 0) {
    return { groups: [], ungrouped: analyzed };
  }

  // Build SHA set for quick lookup
  const commitShaSet = new Set(analyzed.map((c) => c.sha));
  const analyzedMap = new Map(analyzed.map((c) => [c.sha, c]));

  // Fetch commit SHAs for each PR and match
  const assignedShas = new Set<string>();
  const groups: PRGroup[] = [];

  for (const pr of prs) {
    try {
      const prCommitShas = await provider.getCommitsForPR(owner, repo, pr.number);
      pr.commitShas = prCommitShas;

      // Find which of our analyzed commits belong to this PR
      const matchedCommits: AnalyzedCommit[] = [];
      for (const sha of prCommitShas) {
        if (commitShaSet.has(sha) && !assignedShas.has(sha)) {
          matchedCommits.push(analyzedMap.get(sha)!);
          assignedShas.add(sha);
        }
      }

      // Also match by merge commit SHA
      if (pr.mergeCommitSha && commitShaSet.has(pr.mergeCommitSha) && !assignedShas.has(pr.mergeCommitSha)) {
        matchedCommits.push(analyzedMap.get(pr.mergeCommitSha)!);
        assignedShas.add(pr.mergeCommitSha);
      }

      if (matchedCommits.length > 0) {
        groups.push({
          pr,
          commits: matchedCommits,
          category: deriveCategoryFromPR(pr, matchedCommits),
        });
      }
    } catch {
      logger.warn("Failed to get commits for PR", { prNumber: pr.number });
    }
  }

  const ungrouped = analyzed.filter((c) => !assignedShas.has(c.sha));

  logger.info("PR grouping", {
    totalPRs: prs.length,
    matchedPRs: groups.length,
    groupedCommits: assignedShas.size,
    ungroupedCommits: ungrouped.length,
  });

  return { groups, ungrouped };
}

/**
 * Derive a category for the PR group.
 * Priority: PR labels > dominant commit category
 */
function deriveCategoryFromPR(pr: PullRequestInfo, commits: AnalyzedCommit[]): string {
  // Check PR labels for category signals
  const labels = pr.labels.map((l) => l.toLowerCase());

  if (labels.some((l) => l.includes("breaking"))) return "BREAKING_CHANGE";
  if (labels.some((l) => l.includes("feature") || l.includes("enhancement"))) return "NEW_FEATURE";
  if (labels.some((l) => l.includes("bug") || l.includes("fix"))) return "BUG_FIX";
  if (labels.some((l) => l.includes("performance") || l.includes("perf"))) return "PERFORMANCE";
  if (labels.some((l) => l.includes("docs") || l.includes("documentation"))) return "DOCUMENTATION";
  if (labels.some((l) => l.includes("chore") || l.includes("maintenance"))) return "CHORE";

  // Fall back to dominant commit category
  const counts: Record<string, number> = {};
  for (const c of commits) {
    counts[c.category] = (counts[c.category] ?? 0) + 1;
  }

  const priority = ["BREAKING_CHANGE", "NEW_FEATURE", "BUG_FIX", "IMPROVEMENT", "PERFORMANCE"];
  for (const cat of priority) {
    if (counts[cat]) return cat;
  }

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "OTHER";
}
