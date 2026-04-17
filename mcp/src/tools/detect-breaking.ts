import { z } from "zod";
import type { GitProvider } from "../providers/types.js";
import { detectBreakingChanges, type BreakingChange } from "../analysis/breaking-detector.js";
import { logger } from "../utils/logger.js";

export const detectBreakingSchema = z.object({
  owner: z.string().describe("GitHub org/user"),
  repo: z.string().describe("Repository name"),
  base: z.string().describe("Base ref"),
  head: z.string().describe("Head ref"),
});

export type DetectBreakingInput = z.infer<typeof detectBreakingSchema>;

export async function detectBreakingTool(
  provider: GitProvider,
  input: DetectBreakingInput,
): Promise<string> {
  const { owner, repo, base, head } = input;

  logger.info("Detecting breaking changes", { owner, repo, base, head });

  const comparison = await provider.compareRefs(owner, repo, base, head);

  // Fetch diffs for all commits
  const diffs = [];
  for (const commit of comparison.commits) {
    try {
      const diff = await provider.getCommitDiff(owner, repo, commit.sha);
      diffs.push(diff);
    } catch {
      logger.warn("Failed to get diff for commit", { sha: commit.sha });
    }
  }

  const breakingChanges = detectBreakingChanges(diffs);

  if (breakingChanges.length === 0) {
    return `# Breaking Change Analysis: ${base} → ${head}\n\n✅ **No breaking changes detected.**\n\nAnalyzed ${comparison.totalCommits} commits across ${comparison.files.length} files.`;
  }

  const lines: string[] = [];
  lines.push(`# Breaking Change Analysis: ${base} → ${head}\n`);
  lines.push(`⚠️ **${breakingChanges.length} breaking change(s) detected**\n`);
  lines.push(`Analyzed ${comparison.totalCommits} commits across ${comparison.files.length} files.\n`);

  // Group by severity
  const critical = breakingChanges.filter((bc) => bc.severity === "critical");
  const major = breakingChanges.filter((bc) => bc.severity === "major");
  const minor = breakingChanges.filter((bc) => bc.severity === "minor");

  if (critical.length > 0) {
    lines.push("## 🔴 Critical\n");
    for (const bc of critical) {
      formatBreakingChange(bc, lines);
    }
  }

  if (major.length > 0) {
    lines.push("## 🟠 Major\n");
    for (const bc of major) {
      formatBreakingChange(bc, lines);
    }
  }

  if (minor.length > 0) {
    lines.push("## 🟡 Minor\n");
    for (const bc of minor) {
      formatBreakingChange(bc, lines);
    }
  }

  lines.push("## Suggested Migration Notes\n");
  lines.push("Based on the detected changes, consider adding the following to your migration guide:\n");
  for (const bc of breakingChanges) {
    lines.push(`- [ ] **${bc.type}**: ${bc.description}`);
  }

  return lines.join("\n");
}

function formatBreakingChange(bc: BreakingChange, lines: string[]): void {
  lines.push(`### ${bc.type}\n`);
  lines.push(`**File**: \`${bc.file}\``);
  lines.push(`**Description**: ${bc.description}`);
  if (bc.beforeSnippet) {
    lines.push(`\n**Before**:\n\`\`\`\n${bc.beforeSnippet}\n\`\`\``);
  }
  if (bc.afterSnippet) {
    lines.push(`\n**After**:\n\`\`\`\n${bc.afterSnippet}\n\`\`\``);
  }
  lines.push("");
}
