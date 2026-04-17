import type { GitProvider } from "../providers/types.js";
import { logger } from "../utils/logger.js";

/**
 * Tier 3 — Full file context.
 * Retrieves full file content at a specific ref for breaking change analysis.
 * ~1000+ tokens per file.
 */
export async function buildTier3Context(
  provider: GitProvider,
  owner: string,
  repo: string,
  filePaths: string[],
  baseRef: string,
  headRef: string,
): Promise<string> {
  const lines: string[] = [];

  for (const filePath of filePaths) {
    lines.push(`=== ${filePath} ===`);
    lines.push("");

    try {
      const beforeContent = await provider.getFileContent(owner, repo, filePath, baseRef);
      lines.push(`--- BEFORE (${baseRef}) ---`);
      lines.push(beforeContent);
      lines.push("");
    } catch {
      lines.push(`--- BEFORE (${baseRef}) --- [file did not exist]`);
      lines.push("");
    }

    try {
      const afterContent = await provider.getFileContent(owner, repo, filePath, headRef);
      lines.push(`+++ AFTER (${headRef}) +++`);
      lines.push(afterContent);
      lines.push("");
    } catch {
      lines.push(`+++ AFTER (${headRef}) +++ [file was deleted]`);
      lines.push("");
    }

    lines.push("===");
    lines.push("");
  }

  return lines.join("\n");
}
