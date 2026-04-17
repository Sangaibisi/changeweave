import { z } from "zod";
import type { GitProvider } from "../providers/types.js";
import { buildFilesSummary } from "../context/tier1.js";
import { mapFilesToModules } from "../analysis/module-mapper.js";
import { logger } from "../utils/logger.js";

export const compareRefsSchema = z.object({
  owner: z.string().describe("GitHub org/user"),
  repo: z.string().describe("Repository name"),
  base: z.string().describe("Base ref (tag, branch, SHA)"),
  head: z.string().describe("Head ref"),
  include_diffs: z.boolean().default(false).describe("Include file diffs"),
  file_filter: z.string().optional().describe("Glob pattern to filter files (e.g., 'src/**/*.ts')"),
});

export type CompareRefsInput = z.infer<typeof compareRefsSchema>;

export async function compareRefsTool(
  provider: GitProvider,
  input: CompareRefsInput,
): Promise<string> {
  const { owner, repo, base, head, include_diffs, file_filter } = input;

  logger.info("Comparing refs", { owner, repo, base, head });

  const comparison = await provider.compareRefs(owner, repo, base, head);

  let files = comparison.files;
  if (file_filter) {
    const filterRe = globToRegex(file_filter);
    files = files.filter((f) => filterRe.test(f.filename));
  }

  const modules = mapFilesToModules(files);

  const lines: string[] = [];
  lines.push(`# Comparison: ${base} → ${head}\n`);
  lines.push(`**Commits**: ${comparison.totalCommits}`);
  lines.push(`**Ahead by**: ${comparison.aheadBy} | **Behind by**: ${comparison.behindBy}`);
  lines.push(`**Files changed**: ${files.length}`);
  lines.push(`**LOC**: +${comparison.totalAdditions}, -${comparison.totalDeletions}`);
  lines.push("");

  // Modules summary
  if (modules.length > 0) {
    lines.push("## Modules Affected\n");
    for (const mod of modules) {
      lines.push(`- **${mod.name}** — ${mod.files.length} files, +${mod.additions}, -${mod.deletions}`);
    }
    lines.push("");
  }

  // Files summary
  lines.push("## Files\n");
  lines.push(buildFilesSummary(files));

  // Diffs
  if (include_diffs) {
    lines.push("## Diffs\n");
    for (const file of files) {
      lines.push(`### ${file.status} ${file.filename}\n`);
      if (file.patch) {
        lines.push("```diff");
        lines.push(file.patch);
        lines.push("```\n");
      }
    }
  }

  // Commit list
  lines.push("## Commits\n");
  for (const c of comparison.commits) {
    lines.push(`- \`${c.sha.substring(0, 7)}\` ${c.message.split("\n")[0]} — ${c.authorName}`);
  }

  return lines.join("\n");
}

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");
  return new RegExp(`^${escaped}$`);
}
