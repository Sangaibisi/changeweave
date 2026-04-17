import type { GitProvider } from "../providers/types.js";
import { logger } from "../utils/logger.js";

export interface ProjectContext {
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  isPrivate: boolean;
  stars: number;
  lastTag: string | null;
  recentCommitCount: number;
  updatedAt: string;
}

export async function getProjectContext(
  provider: GitProvider,
  owner: string,
  repo: string,
): Promise<ProjectContext> {
  logger.debug("Fetching project context", { owner, repo });

  const repoInfo = await provider.getRepoInfo(owner, repo);

  let lastTag: string | null = null;
  try {
    const tags = await provider.listTags(owner, repo, 1);
    lastTag = tags.length > 0 ? tags[0].name : null;
  } catch {
    logger.debug("Could not fetch tags");
  }

  let recentCommitCount = 0;
  try {
    const commits = await provider.listCommits(owner, repo, { perPage: 1 });
    recentCommitCount = commits.length;
  } catch {
    logger.debug("Could not fetch recent commits");
  }

  return {
    name: repoInfo.name,
    fullName: repoInfo.fullName,
    description: repoInfo.description,
    defaultBranch: repoInfo.defaultBranch,
    language: repoInfo.language,
    isPrivate: repoInfo.private,
    stars: repoInfo.stars,
    lastTag,
    recentCommitCount,
    updatedAt: repoInfo.updatedAt,
  };
}

export function formatProjectContext(ctx: ProjectContext): string {
  const lines: string[] = [];
  lines.push(`# Project: ${ctx.fullName}\n`);
  lines.push(`**Description**: ${ctx.description ?? "N/A"}`);
  lines.push(`**Language**: ${ctx.language ?? "Unknown"}`);
  lines.push(`**Default branch**: ${ctx.defaultBranch}`);
  lines.push(`**Visibility**: ${ctx.isPrivate ? "Private" : "Public"}`);
  lines.push(`**Stars**: ${ctx.stars}`);
  lines.push(`**Last tag**: ${ctx.lastTag ?? "None"}`);
  lines.push(`**Updated**: ${ctx.updatedAt}`);
  return lines.join("\n");
}
