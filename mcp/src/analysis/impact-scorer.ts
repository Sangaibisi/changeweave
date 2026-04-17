import type { CommitCategory, ImpactScore, FileChangeInfo } from "../providers/types.js";

const CRITICAL_PATH_PATTERNS = [
  /auth/i, /security/i, /payment/i, /billing/i, /crypto/i, /session/i, /permission/i,
];

const PUBLIC_INTERFACE_PATTERNS = [
  /api\//i, /routes?\//i, /controller/i, /endpoint/i, /graphql/i,
];

const SUPPORT_PATTERNS = [
  /test/i, /spec/i, /__tests__/i, /docs?\//i, /\.md$/i, /config/i, /\.env/i,
];

function getModuleWeight(filename: string): number {
  if (CRITICAL_PATH_PATTERNS.some((p) => p.test(filename))) return 2.0;
  if (PUBLIC_INTERFACE_PATTERNS.some((p) => p.test(filename))) return 1.5;
  if (SUPPORT_PATTERNS.some((p) => p.test(filename))) return 0.5;
  return 1.0;
}

function getChangeMagnitude(additions: number, deletions: number): number {
  const total = additions + deletions;
  if (total <= 10) return 0.5;
  if (total <= 50) return 1.0;
  if (total <= 200) return 1.5;
  return 2.0;
}

function getCategoryBaseScore(category: CommitCategory): number {
  switch (category) {
    case "BREAKING_CHANGE": return 3.0;
    case "NEW_FEATURE": return 2.0;
    case "BUG_FIX": return 1.5;
    case "PERFORMANCE": return 1.5;
    case "DEPRECATION": return 1.5;
    case "IMPROVEMENT": return 1.0;
    case "DOCUMENTATION": return 0.5;
    case "CHORE": return 0.3;
    case "OTHER": return 0.5;
  }
}

/**
 * Score the impact of a commit based on category, changed files, and LOC.
 */
export function scoreImpact(
  category: CommitCategory,
  filesChanged: FileChangeInfo[] = [],
  totalAdditions: number = 0,
  totalDeletions: number = 0,
): ImpactScore {
  const baseScore = getCategoryBaseScore(category);

  const maxModuleWeight = filesChanged.length > 0
    ? Math.max(...filesChanged.map((f) => getModuleWeight(f.filename)))
    : 1.0;

  const magnitude = getChangeMagnitude(totalAdditions, totalDeletions);

  const finalScore = baseScore * maxModuleWeight * magnitude;

  if (finalScore >= 3.0) return "HIGH";
  if (finalScore >= 1.0) return "MEDIUM";
  return "LOW";
}

/**
 * Check if any file is in a critical path (auth, payment, security).
 */
export function isCriticalPath(files: FileChangeInfo[]): boolean {
  return files.some((f) => CRITICAL_PATH_PATTERNS.some((p) => p.test(f.filename)));
}
