import type { CommitDiff, FileDiff, DiffHunk } from "../providers/types.js";

/**
 * Tier 2 — Diff hunks context.
 * Actual code changes for high-impact commits.
 * ~200-500 tokens per commit.
 */
export function buildTier2Context(diffs: CommitDiff[]): string {
  const lines: string[] = [];

  for (const diff of diffs) {
    const shortSha = diff.sha.substring(0, 7);
    lines.push(`Commit: ${shortSha} — "${diff.message.split("\n")[0]}"`);
    lines.push(`Author: ${diff.authorName} | Date: ${diff.date}`);
    lines.push(`Total: +${diff.totalAdditions}, -${diff.totalDeletions}`);
    lines.push("");

    for (const file of diff.files) {
      lines.push(`  ${file.status} ${file.filename} (+${file.additions}, -${file.deletions})`);
      if (file.previousFilename) {
        lines.push(`    (renamed from ${file.previousFilename})`);
      }
      for (const hunk of file.hunks) {
        lines.push(`    @@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
        const hunkLines = hunk.content.split("\n").slice(0, 20);
        for (const hl of hunkLines) {
          lines.push(`    ${hl}`);
        }
        if (hunk.content.split("\n").length > 20) {
          lines.push("    ... (truncated)");
        }
      }
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Build diff context for a single file.
 */
export function buildFileDiffContext(file: FileDiff): string {
  const lines: string[] = [];
  lines.push(`${file.status} ${file.filename} (+${file.additions}, -${file.deletions})`);
  if (file.previousFilename) {
    lines.push(`(renamed from ${file.previousFilename})`);
  }
  for (const hunk of file.hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
    lines.push(hunk.content);
  }
  return lines.join("\n");
}
