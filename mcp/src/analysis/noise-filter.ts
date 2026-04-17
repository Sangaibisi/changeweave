import type { CommitInfo } from "../providers/types.js";
import { logger } from "../utils/logger.js";

export interface NoiseFilterResult {
  /** Commits that pass the filter (meaningful) */
  meaningful: CommitInfo[];
  /** Commits classified as noise */
  noise: CommitInfo[];
}

/**
 * Noise patterns — commits matching these are low-value for changelogs.
 * They are not deleted but downgraded / excluded from the main output.
 */
const NOISE_PATTERNS: RegExp[] = [
  // WIP / temp
  /^wip\b/i,
  /^work in progress/i,
  /^temp\b/i,
  /^tmp\b/i,
  /^todo\b/i,
  /^xxx\b/i,
  /^asdf/i,
  /^test$/i,
  /^testing$/i,

  // Typo / minor fixes
  /^fix\s*typo/i,
  /^typo/i,
  /^fix\s*whitespace/i,
  /^fix\s*formatting/i,
  /^fix\s*indent/i,
  /^lint\s*fix/i,
  /^prettier/i,
  /^format\s*code/i,

  // Merge commits
  /^Merge branch\s/i,
  /^Merge pull request\s/i,
  /^Merge remote-tracking/i,
  /^Merged\s/i,

  // Git operations
  /^initial commit$/i,
  /^first commit$/i,
  /^init$/i,
  /^\.$/,

  // Version bumps (usually automated)
  /^bump\s+version/i,
  /^chore\(release\)/i,
  /^\d+\.\d+\.\d+$/,

  // CI/CD noise
  /^ci:\s*fix/i,
  /^ci:\s*update/i,
  /^update\s+\.gitignore/i,
  /^update\s+readme/i,
  /^update\s+changelog/i,

  // Empty or meaningless
  /^\.+$/,
  /^-+$/,
  /^update$/i,
  /^fix$/i,
  /^changes$/i,
  /^misc$/i,
  /^stuff$/i,
  /^cleanup$/i,
  /^clean\s*up$/i,
];

/**
 * Additional heuristic: if a commit only touches non-source files
 * (e.g., only .md, .gitignore, lockfiles), it's likely noise.
 */
const NON_SOURCE_PATTERNS: RegExp[] = [
  /\.lock$/i,
  /lock\.json$/i,
  /\.gitignore$/i,
  /\.editorconfig$/i,
  /\.prettierrc/i,
  /\.eslintrc/i,
  /CHANGELOG\.md$/i,
  /LICENSE/i,
];

function isNonSourceOnly(commit: CommitInfo): boolean {
  if (commit.filesChanged.length === 0) return false;
  return commit.filesChanged.every((f) =>
    NON_SOURCE_PATTERNS.some((p) => p.test(f.filename)),
  );
}

/**
 * Check if a commit message follows conventional commit format with a meaningful type.
 * These should never be filtered as noise.
 */
const MEANINGFUL_PREFIX_RE =
  /^(feat|fix|perf|refactor|breaking)(\(.+\))?!?:\s/i;

/**
 * Filter out noisy commits that add no value to release notes.
 */
export function filterNoise(commits: CommitInfo[]): NoiseFilterResult {
  const meaningful: CommitInfo[] = [];
  const noise: CommitInfo[] = [];

  for (const commit of commits) {
    const firstLine = commit.message.split("\n")[0].trim();

    // Never filter commits with meaningful conventional commit prefixes
    if (MEANINGFUL_PREFIX_RE.test(firstLine)) {
      meaningful.push(commit);
      continue;
    }

    const isNoisy =
      NOISE_PATTERNS.some((p) => p.test(firstLine)) || isNonSourceOnly(commit);

    if (isNoisy) {
      noise.push(commit);
    } else {
      meaningful.push(commit);
    }
  }

  if (noise.length > 0) {
    logger.info("Noise filter", {
      total: commits.length,
      meaningful: meaningful.length,
      noise: noise.length,
    });
  }

  return { meaningful, noise };
}
