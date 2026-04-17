import type { CommitInfo } from "../providers/types.js";
import type { AnalyzedCommit } from "./index.js";
import { logger } from "../utils/logger.js";

export interface CommitCluster {
  /** Auto-generated cluster ID */
  id: string;
  /** Representative label for this cluster (derived from dominant category + module) */
  label: string;
  /** Dominant category across cluster commits */
  category: string;
  /** All modules affected by this cluster */
  modules: string[];
  /** Commits in this cluster */
  commits: AnalyzedCommit[];
  /** Union of all files touched */
  files: string[];
  /** Total LOC */
  additions: number;
  deletions: number;
}

export interface ClusteringResult {
  clusters: CommitCluster[];
  unclustered: AnalyzedCommit[];
}

/** Max time gap (in ms) between commits to be considered same cluster */
const TIME_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Minimum file overlap ratio to merge two commits into same cluster */
const FILE_OVERLAP_THRESHOLD = 0.3;

/**
 * Cluster commits that likely belong to the same logical change.
 *
 * Heuristics:
 * 1. Same author + overlapping files + close in time → same cluster
 * 2. Same module + same category + close in time → same cluster
 * 3. Remaining commits stay unclustered (each is its own entry)
 */
export function clusterCommits(
  commits: CommitInfo[],
  analyzed: AnalyzedCommit[],
): ClusteringResult {
  if (analyzed.length <= 1) {
    return { clusters: [], unclustered: analyzed };
  }

  // Build a map from sha to commit info for file data
  const commitMap = new Map<string, CommitInfo>();
  for (const c of commits) {
    commitMap.set(c.sha, c);
  }

  // Build adjacency: which commits should be in the same cluster
  const n = analyzed.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (shouldCluster(analyzed[i], analyzed[j], commitMap)) {
        union(i, j);
      }
    }
  }

  // Group by root
  const groupMap = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groupMap.has(root)) groupMap.set(root, []);
    groupMap.get(root)!.push(i);
  }

  const clusters: CommitCluster[] = [];
  const unclustered: AnalyzedCommit[] = [];

  let clusterId = 0;
  for (const indices of groupMap.values()) {
    if (indices.length === 1) {
      unclustered.push(analyzed[indices[0]]);
      continue;
    }

    const clusterCommits = indices.map((i) => analyzed[i]);
    const allFiles = new Set<string>();
    let additions = 0;
    let deletions = 0;

    for (const ac of clusterCommits) {
      const ci = commitMap.get(ac.sha);
      if (ci) {
        for (const f of ci.filesChanged) allFiles.add(f.filename);
        additions += ci.totalAdditions;
        deletions += ci.totalDeletions;
      }
    }

    const allModules = [...new Set(clusterCommits.flatMap((c) => c.modulesAffected))];
    const dominantCategory = getDominantCategory(clusterCommits);
    const label = buildClusterLabel(dominantCategory, allModules, clusterCommits);

    clusters.push({
      id: `cluster-${++clusterId}`,
      label,
      category: dominantCategory,
      modules: allModules,
      commits: clusterCommits,
      files: Array.from(allFiles),
      additions,
      deletions,
    });
  }

  if (clusters.length > 0) {
    logger.info("Commit clustering", {
      clusters: clusters.length,
      unclustered: unclustered.length,
      totalCommits: analyzed.length,
    });
  }

  return { clusters, unclustered };
}

function shouldCluster(
  a: AnalyzedCommit,
  b: AnalyzedCommit,
  commitMap: Map<string, CommitInfo>,
): boolean {
  // Time proximity check
  const timeA = new Date(a.date).getTime();
  const timeB = new Date(b.date).getTime();
  if (Math.abs(timeA - timeB) > TIME_WINDOW_MS) return false;

  const ciA = commitMap.get(a.sha);
  const ciB = commitMap.get(b.sha);

  // Same author + overlapping files
  if (a.authorName === b.authorName && ciA && ciB) {
    const filesA = new Set(ciA.filesChanged.map((f) => f.filename));
    const filesB = new Set(ciB.filesChanged.map((f) => f.filename));
    const overlap = [...filesA].filter((f) => filesB.has(f)).length;
    const minSize = Math.min(filesA.size, filesB.size);
    if (minSize > 0 && overlap / minSize >= FILE_OVERLAP_THRESHOLD) {
      return true;
    }
  }

  // Same module + same category + same author
  if (
    a.authorName === b.authorName &&
    a.category === b.category &&
    a.modulesAffected.some((m) => b.modulesAffected.includes(m))
  ) {
    return true;
  }

  return false;
}

function getDominantCategory(commits: AnalyzedCommit[]): string {
  const counts: Record<string, number> = {};
  for (const c of commits) {
    counts[c.category] = (counts[c.category] ?? 0) + 1;
  }
  // Priority: BREAKING_CHANGE > NEW_FEATURE > BUG_FIX > rest
  const priority = ["BREAKING_CHANGE", "NEW_FEATURE", "BUG_FIX", "IMPROVEMENT", "PERFORMANCE"];
  for (const cat of priority) {
    if (counts[cat]) return cat;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "OTHER";
}

function buildClusterLabel(
  category: string,
  modules: string[],
  commits: AnalyzedCommit[],
): string {
  const moduleStr = modules.slice(0, 2).join(", ");
  const catLabel: Record<string, string> = {
    NEW_FEATURE: "New Feature",
    BUG_FIX: "Bug Fix",
    IMPROVEMENT: "Improvement",
    PERFORMANCE: "Performance",
    BREAKING_CHANGE: "Breaking Change",
    CHORE: "Maintenance",
    DOCUMENTATION: "Documentation",
    OTHER: "Changes",
  };
  const cat = catLabel[category] ?? "Changes";
  return `${cat} in ${moduleStr || "project"} (${commits.length} commits)`;
}
