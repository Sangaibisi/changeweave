import type { CommitCategory, FileChangeInfo } from "../providers/types.js";

const CONVENTIONAL_COMMIT_RE =
  /^(feat|fix|perf|refactor|docs|style|test|chore|ci|build|revert)(\(.+\))?(!)?\s*:\s*(.+)$/i;

/**
 * Categorize a commit based on its message AND changed files (diff-aware).
 * Falls back to keyword-based detection when conventional commit format is not used.
 */
export function categorizeCommit(
  message: string,
  filesChanged: FileChangeInfo[] = [],
): CommitCategory {
  const firstLine = message.split("\n")[0].trim();
  const match = CONVENTIONAL_COMMIT_RE.exec(firstLine);

  if (match) {
    const type = match[1].toLowerCase();
    const breaking = match[3] === "!";
    if (breaking) return "BREAKING_CHANGE";

    switch (type) {
      case "feat": return "NEW_FEATURE";
      case "fix": return "BUG_FIX";
      case "perf": return "PERFORMANCE";
      case "refactor": return "IMPROVEMENT";
      case "docs": return "DOCUMENTATION";
      case "chore": case "ci": case "build": case "style": case "test": return "CHORE";
      case "revert": return "OTHER";
      default: return "OTHER";
    }
  }

  // Diff-aware categorization: analyze changed file paths
  if (filesChanged.length > 0) {
    const paths = filesChanged.map((f) => f.filename.toLowerCase());

    const allTests = paths.every((p) => p.includes("test") || p.includes("spec") || p.includes("__tests__"));
    if (allTests) return "CHORE";

    const allDocs = paths.every((p) =>
      p.includes("doc") || p.includes("readme") || p.endsWith(".md"),
    );
    if (allDocs) return "DOCUMENTATION";

    const allConfig = paths.every((p) =>
      p.includes("config") || p.includes(".env") || p.endsWith(".json") || p.endsWith(".yml") || p.endsWith(".yaml"),
    );
    if (allConfig) return "CHORE";

    const hasDeletedExports = filesChanged.some(
      (f) => f.status === "deleted" && (f.filename.includes("api") || f.filename.includes("routes")),
    );
    if (hasDeletedExports) return "BREAKING_CHANGE";
  }

  // Keyword-based fallback
  const lower = firstLine.toLowerCase();
  if (lower.includes("breaking")) return "BREAKING_CHANGE";
  if (lower.includes("fix") || lower.includes("bug") || lower.includes("patch")) return "BUG_FIX";
  if (lower.includes("feat") || lower.includes("add") || lower.includes("new")) return "NEW_FEATURE";
  if (lower.includes("perf") || lower.includes("optim") || lower.includes("speed")) return "PERFORMANCE";
  if (lower.includes("improve") || lower.includes("enhance") || lower.includes("update")) return "IMPROVEMENT";
  if (lower.includes("doc") || lower.includes("readme")) return "DOCUMENTATION";
  if (lower.includes("deprecat")) return "DEPRECATION";

  return "OTHER";
}
