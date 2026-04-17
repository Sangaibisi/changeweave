import type { CommitCategory, ImpactScore, CommitInfo, CommitDiff } from "../providers/types.js";
import { categorizeCommit } from "./categorizer.js";
import { scoreImpact, isCriticalPath } from "./impact-scorer.js";
import { detectBreakingChanges, type BreakingChange } from "./breaking-detector.js";
import { mapFilesToModules, type ModuleInfo } from "./module-mapper.js";
import { detectReverts, type RevertPair } from "./revert-detector.js";
import { filterNoise } from "./noise-filter.js";

export interface AnalyzedCommit {
  sha: string;
  message: string;
  authorName: string;
  date: string;
  category: CommitCategory;
  impact: ImpactScore;
  isCriticalPath: boolean;
  modulesAffected: string[];
}

export interface AnalysisResult {
  commits: AnalyzedCommit[];
  modules: ModuleInfo[];
  breakingChanges: BreakingChange[];
  summary: {
    total: number;
    byCategory: Record<string, number>;
    byImpact: Record<string, number>;
    totalAdditions: number;
    totalDeletions: number;
    modulesAffected: string[];
    hasCriticalPathChanges: boolean;
  };
  /** Pre-processing metadata */
  preprocessing: {
    revertPairs: RevertPair[];
    noiseCount: number;
    originalCount: number;
  };
}

/**
 * Analyze a list of commits with optional diff data.
 * Now includes preprocessing: revert detection + noise filtering.
 */
export function analyzeCommits(
  commits: CommitInfo[],
  diffs?: CommitDiff[],
): AnalysisResult {
  const originalCount = commits.length;

  // Step 1: Detect and eliminate revert pairs
  const revertResult = detectReverts(commits);
  let cleaned = revertResult.filtered;

  // Step 2: Filter noise commits
  const noiseResult = filterNoise(cleaned);
  cleaned = noiseResult.meaningful;

  // Step 3: Analyze cleaned commits
  const diffMap = new Map<string, CommitDiff>();
  if (diffs) {
    for (const d of diffs) {
      diffMap.set(d.sha, d);
    }
  }

  const allFiles = cleaned.flatMap((c) => c.filesChanged);
  const modules = mapFilesToModules(allFiles);
  const moduleNameMap = new Map<string, string[]>();

  for (const mod of modules) {
    for (const f of mod.files) {
      if (!moduleNameMap.has(f)) moduleNameMap.set(f, []);
      moduleNameMap.get(f)!.push(mod.name);
    }
  }

  const analyzedCommits: AnalyzedCommit[] = cleaned.map((c) => {
    const category = categorizeCommit(c.message, c.filesChanged);
    const impact = scoreImpact(category, c.filesChanged, c.totalAdditions, c.totalDeletions);
    const critical = isCriticalPath(c.filesChanged);
    const affected = new Set<string>();
    for (const f of c.filesChanged) {
      const mods = moduleNameMap.get(f.filename);
      if (mods) mods.forEach((m) => affected.add(m));
    }

    return {
      sha: c.sha,
      message: c.message.split("\n")[0],
      authorName: c.authorName,
      date: c.date,
      category,
      impact,
      isCriticalPath: critical,
      modulesAffected: Array.from(affected),
    };
  });

  const breakingChanges = diffs ? detectBreakingChanges(diffs) : [];

  const byCategory: Record<string, number> = {};
  const byImpact: Record<string, number> = {};
  for (const ac of analyzedCommits) {
    byCategory[ac.category] = (byCategory[ac.category] ?? 0) + 1;
    byImpact[ac.impact] = (byImpact[ac.impact] ?? 0) + 1;
  }

  return {
    commits: analyzedCommits,
    modules,
    breakingChanges,
    summary: {
      total: analyzedCommits.length,
      byCategory,
      byImpact,
      totalAdditions: cleaned.reduce((s, c) => s + c.totalAdditions, 0),
      totalDeletions: cleaned.reduce((s, c) => s + c.totalDeletions, 0),
      modulesAffected: modules.map((m) => m.name),
      hasCriticalPathChanges: analyzedCommits.some((c) => c.isCriticalPath),
    },
    preprocessing: {
      revertPairs: revertResult.pairs,
      noiseCount: noiseResult.noise.length,
      originalCount,
    },
  };
}

export type { BreakingChange } from "./breaking-detector.js";
export type { ModuleInfo } from "./module-mapper.js";
export type { RevertPair } from "./revert-detector.js";
export { categorizeCommit } from "./categorizer.js";
export { scoreImpact, isCriticalPath } from "./impact-scorer.js";
export { detectBreakingChanges } from "./breaking-detector.js";
export { mapFilesToModules } from "./module-mapper.js";
export { detectReverts } from "./revert-detector.js";
export { filterNoise } from "./noise-filter.js";
export { clusterCommits, type CommitCluster, type ClusteringResult } from "./commit-clusterer.js";
export { groupByPullRequests, type PRGroup, type PRGroupingResult } from "./pr-grouper.js";
