import type { ChangeWeaveClient } from "../client/index.js";
import { logger } from "../utils/logger.js";

export interface LatestChangelog {
  version: string;
  title: string;
  content: string;
  publishedAt: string | null;
  isDraft: boolean;
}

export async function getLatestChangelog(
  client: ChangeWeaveClient,
  repoId: string,
): Promise<LatestChangelog | null> {
  logger.debug("Fetching latest changelog", { repoId });

  try {
    const changelogs = await client.listChangelogs(repoId, "all", 1);
    if (changelogs.length === 0) return null;

    const cl = changelogs[0];
    return {
      version: cl.version,
      title: cl.title,
      content: cl.content ?? "",
      publishedAt: cl.publishedAt ?? null,
      isDraft: cl.isDraft,
    };
  } catch {
    logger.warn("Could not fetch latest changelog from backend");
    return null;
  }
}

export function formatLatestChangelog(cl: LatestChangelog | null): string {
  if (!cl) {
    return "No changelogs found for this repository.";
  }

  const lines: string[] = [];
  const status = cl.isDraft ? "📝 Draft" : "✅ Published";
  lines.push(`# Latest Changelog: v${cl.version}\n`);
  lines.push(`**Title**: ${cl.title}`);
  lines.push(`**Status**: ${status}`);
  if (cl.publishedAt) lines.push(`**Published**: ${cl.publishedAt}`);
  lines.push("");
  lines.push(cl.content);

  return lines.join("\n");
}
