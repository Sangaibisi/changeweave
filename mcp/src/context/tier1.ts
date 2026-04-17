import type { CommitInfo, FileChangeInfo } from "../providers/types.js";

/**
 * Tier 1 — Summary context.
 * Commit messages + file names + LOC stats.
 * ~50 tokens per commit.
 */
export function buildTier1Context(commits: CommitInfo[]): string {
  const lines: string[] = [];

  for (const commit of commits) {
    const shortSha = commit.sha.substring(0, 7);
    lines.push(`Commit: ${shortSha} — "${commit.message.split("\n")[0]}"`);
    lines.push(`Author: ${commit.authorName} | Date: ${commit.date}`);

    if (commit.filesChanged.length > 0) {
      const filesSummary = commit.filesChanged
        .map((f) => `${f.filename} (+${f.additions}, -${f.deletions})`)
        .join(", ");
      lines.push(`Files: ${filesSummary}`);
    }

    if (commit.totalAdditions > 0 || commit.totalDeletions > 0) {
      lines.push(`LOC: +${commit.totalAdditions}, -${commit.totalDeletions}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Build a file-level summary for a branch comparison.
 */
export function buildFilesSummary(files: FileChangeInfo[]): string {
  const lines: string[] = [];
  lines.push(`Total files changed: ${files.length}`);
  lines.push("");

  const byDir = new Map<string, FileChangeInfo[]>();
  for (const f of files) {
    const dir = f.filename.includes("/")
      ? f.filename.substring(0, f.filename.lastIndexOf("/"))
      : ".";
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push(f);
  }

  for (const [dir, dirFiles] of byDir) {
    const totalAdd = dirFiles.reduce((s, f) => s + f.additions, 0);
    const totalDel = dirFiles.reduce((s, f) => s + f.deletions, 0);
    lines.push(`${dir}/ (${dirFiles.length} files, +${totalAdd}, -${totalDel})`);
    for (const f of dirFiles) {
      const name = f.filename.substring(f.filename.lastIndexOf("/") + 1);
      lines.push(`  ${f.status} ${name} (+${f.additions}, -${f.deletions})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
