import type { GitProvider } from "../providers/types.js";
import { categorizeCommit } from "../analysis/categorizer.js";
import { logger } from "../utils/logger.js";

export interface RecentCommitsSummary {
  repoFullName: string;
  since: string | null;
  count: number;
  commits: {
    sha: string;
    message: string;
    author: string;
    date: string;
    category: string;
  }[];
  byCategory: Record<string, number>;
}

export async function getRecentCommits(
  provider: GitProvider,
  owner: string,
  repo: string,
  sinceTag?: string,
  limit: number = 30,
): Promise<RecentCommitsSummary> {
  logger.debug("Fetching recent commits", { owner, repo, sinceTag });

  let since: string | undefined;
  if (sinceTag) {
    try {
      const tags = await provider.listTags(owner, repo, 20);
      const tag = tags.find((t) => t.name === sinceTag);
      if (tag) {
        const commits = await provider.listCommits(owner, repo, { sha: tag.sha, perPage: 1 });
        if (commits.length > 0) {
          since = commits[0].date;
        }
      }
    } catch {
      logger.debug("Could not resolve tag date");
    }
  }

  const commits = await provider.listCommits(owner, repo, {
    since,
    perPage: limit,
  });

  const byCategory: Record<string, number> = {};
  const mapped = commits.map((c) => {
    const category = categorizeCommit(c.message);
    byCategory[category] = (byCategory[category] ?? 0) + 1;
    return {
      sha: c.sha,
      message: c.message.split("\n")[0],
      author: c.authorName,
      date: c.date,
      category,
    };
  });

  return {
    repoFullName: `${owner}/${repo}`,
    since: sinceTag ?? null,
    count: mapped.length,
    commits: mapped,
    byCategory,
  };
}

export function formatRecentCommits(summary: RecentCommitsSummary): string {
  const lines: string[] = [];
  lines.push(`# Recent Commits: ${summary.repoFullName}\n`);
  if (summary.since) {
    lines.push(`**Since**: ${summary.since}`);
  }
  lines.push(`**Count**: ${summary.count}\n`);

  lines.push("## By Category\n");
  for (const [cat, count] of Object.entries(summary.byCategory)) {
    lines.push(`- **${cat}**: ${count}`);
  }
  lines.push("");

  lines.push("## Commits\n");
  for (const c of summary.commits) {
    lines.push(`- \`${c.sha.substring(0, 7)}\` **${c.category}** — ${c.message} (${c.author})`);
  }

  return lines.join("\n");
}
