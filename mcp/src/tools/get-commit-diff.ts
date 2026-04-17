import { z } from "zod";
import type { GitProvider } from "../providers/types.js";
import { categorizeCommit } from "../analysis/categorizer.js";
import { scoreImpact } from "../analysis/impact-scorer.js";
import { buildFileDiffContext } from "../context/tier2.js";
import { logger } from "../utils/logger.js";

export const getCommitDiffSchema = z.object({
  owner: z.string().describe("GitHub org/user"),
  repo: z.string().describe("Repository name"),
  sha: z.string().describe("Commit SHA"),
  context_lines: z.number().default(3).describe("Lines of context around changes"),
});

export type GetCommitDiffInput = z.infer<typeof getCommitDiffSchema>;

export async function getCommitDiffTool(
  provider: GitProvider,
  input: GetCommitDiffInput,
): Promise<string> {
  const { owner, repo, sha } = input;

  logger.info("Getting commit diff", { owner, repo, sha });

  const diff = await provider.getCommitDiff(owner, repo, sha);

  const filesAsChangeInfo = diff.files.map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
  }));

  const category = categorizeCommit(diff.message, filesAsChangeInfo);
  const impact = scoreImpact(category, filesAsChangeInfo, diff.totalAdditions, diff.totalDeletions);

  const lines: string[] = [];
  lines.push(`# Commit ${diff.sha.substring(0, 7)}\n`);
  lines.push(`**Message**: ${diff.message}`);
  lines.push(`**Author**: ${diff.authorName}`);
  lines.push(`**Date**: ${diff.date}`);
  lines.push(`**Category**: ${category}`);
  lines.push(`**Impact**: ${impact}`);
  lines.push(`**LOC**: +${diff.totalAdditions}, -${diff.totalDeletions}`);
  lines.push(`**Files**: ${diff.files.length}`);
  lines.push("");

  lines.push("## Files Changed\n");
  for (const file of diff.files) {
    lines.push(`### ${file.status} ${file.filename} (+${file.additions}, -${file.deletions})\n`);
    if (file.previousFilename) {
      lines.push(`_Renamed from ${file.previousFilename}_\n`);
    }
    if (file.hunks.length > 0) {
      lines.push("```diff");
      lines.push(buildFileDiffContext(file));
      lines.push("```\n");
    }
  }

  return lines.join("\n");
}
