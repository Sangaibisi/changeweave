import { Octokit } from "@octokit/rest";
import { logger } from "../utils/logger.js";
import { GitProviderError } from "../utils/errors.js";
import type {
  GitProvider,
  RepoInfo,
  CommitInfo,
  CommitDiff,
  FileDiff,
  DiffHunk,
  BranchComparison,
  FileChangeInfo,
  FileStatus,
  PullRequestInfo,
} from "./types.js";

function parsePatchToHunks(patch: string | undefined): DiffHunk[] {
  if (!patch) return [];
  const hunks: DiffHunk[] = [];
  const hunkRegex = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/gm;
  let match: RegExpExecArray | null;
  const lines = patch.split("\n");
  let currentHunk: DiffHunk | null = null;
  const hunkLines: string[] = [];

  for (const line of lines) {
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/);
    if (hunkMatch) {
      if (currentHunk) {
        currentHunk.content = hunkLines.join("\n");
        hunks.push(currentHunk);
        hunkLines.length = 0;
      }
      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldLines: parseInt(hunkMatch[2] ?? "1", 10),
        newStart: parseInt(hunkMatch[3], 10),
        newLines: parseInt(hunkMatch[4] ?? "1", 10),
        content: "",
      };
    } else if (currentHunk) {
      hunkLines.push(line);
    }
  }
  if (currentHunk) {
    currentHunk.content = hunkLines.join("\n");
    hunks.push(currentHunk);
  }
  return hunks;
}

export class GitHubProvider implements GitProvider {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
    try {
      const { data } = await this.octokit.repos.get({ owner, repo });
      return {
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        defaultBranch: data.default_branch,
        language: data.language,
        private: data.private,
        stars: data.stargazers_count,
        openIssues: data.open_issues_count,
        updatedAt: data.updated_at ?? "",
      };
    } catch (err: any) {
      logger.error("Failed to get repo info", { owner, repo, error: err.message });
      throw new GitProviderError(`Failed to get repo info: ${err.message}`, err.status);
    }
  }

  async listCommits(
    owner: string,
    repo: string,
    options?: { sha?: string; since?: string; until?: string; perPage?: number },
  ): Promise<CommitInfo[]> {
    try {
      const { data } = await this.octokit.repos.listCommits({
        owner,
        repo,
        sha: options?.sha,
        since: options?.since,
        until: options?.until,
        per_page: options?.perPage ?? 50,
      });

      return data.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        authorName: c.commit.author?.name ?? c.author?.login ?? "Unknown",
        authorEmail: c.commit.author?.email ?? "",
        date: c.commit.author?.date ?? "",
        filesChanged: [],
        totalAdditions: 0,
        totalDeletions: 0,
      }));
    } catch (err: any) {
      logger.error("Failed to list commits", { owner, repo, error: err.message });
      throw new GitProviderError(`Failed to list commits: ${err.message}`, err.status);
    }
  }

  async getCommitDiff(owner: string, repo: string, sha: string): Promise<CommitDiff> {
    try {
      const { data } = await this.octokit.repos.getCommit({ owner, repo, ref: sha });

      const files: FileDiff[] = (data.files ?? []).map((f) => ({
        filename: f.filename,
        status: f.status as FileStatus,
        additions: f.additions,
        deletions: f.deletions,
        hunks: parsePatchToHunks(f.patch),
        previousFilename: f.previous_filename,
      }));

      return {
        sha: data.sha,
        message: data.commit.message,
        authorName: data.commit.author?.name ?? "Unknown",
        date: data.commit.author?.date ?? "",
        files,
        totalAdditions: data.stats?.additions ?? 0,
        totalDeletions: data.stats?.deletions ?? 0,
      };
    } catch (err: any) {
      logger.error("Failed to get commit diff", { owner, repo, sha, error: err.message });
      throw new GitProviderError(`Failed to get commit diff: ${err.message}`, err.status);
    }
  }

  async compareRefs(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<BranchComparison> {
    try {
      const { data } = await this.octokit.repos.compareCommits({
        owner,
        repo,
        base,
        head,
      });

      const commits: CommitInfo[] = data.commits.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        authorName: c.commit.author?.name ?? c.author?.login ?? "Unknown",
        authorEmail: c.commit.author?.email ?? "",
        date: c.commit.author?.date ?? "",
        filesChanged: [],
        totalAdditions: 0,
        totalDeletions: 0,
      }));

      const files: FileChangeInfo[] = (data.files ?? []).map((f) => ({
        filename: f.filename,
        status: f.status as FileStatus,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
        previousFilename: f.previous_filename,
      }));

      return {
        baseRef: base,
        headRef: head,
        aheadBy: data.ahead_by,
        behindBy: data.behind_by,
        totalCommits: data.total_commits,
        commits,
        files,
        totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
        totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
      };
    } catch (err: any) {
      logger.error("Failed to compare refs", { owner, repo, base, head, error: err.message });
      throw new GitProviderError(`Failed to compare refs: ${err.message}`, err.status);
    }
  }

  async listTags(
    owner: string,
    repo: string,
    perPage: number = 20,
  ): Promise<{ name: string; sha: string }[]> {
    try {
      const { data } = await this.octokit.repos.listTags({ owner, repo, per_page: perPage });
      return data.map((t) => ({ name: t.name, sha: t.commit.sha }));
    } catch (err: any) {
      logger.error("Failed to list tags", { owner, repo, error: err.message });
      throw new GitProviderError(`Failed to list tags: ${err.message}`, err.status);
    }
  }

  async listMergedPullRequests(
    owner: string,
    repo: string,
    options?: { base?: string; since?: string; perPage?: number },
  ): Promise<PullRequestInfo[]> {
    try {
      const { data } = await this.octokit.pulls.list({
        owner,
        repo,
        state: "closed",
        sort: "updated",
        direction: "desc",
        base: options?.base,
        per_page: options?.perPage ?? 50,
      });

      const merged = data.filter((pr) => pr.merged_at !== null);
      const filtered = options?.since
        ? merged.filter((pr) => pr.merged_at! >= options.since!)
        : merged;

      return filtered.map((pr) => ({
        number: pr.number,
        title: pr.title,
        body: pr.body,
        authorLogin: pr.user?.login ?? "Unknown",
        mergedAt: pr.merged_at ?? "",
        mergeCommitSha: pr.merge_commit_sha ?? null,
        labels: pr.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")),
        commitShas: [],
      }));
    } catch (err: any) {
      logger.error("Failed to list pull requests", { owner, repo, error: err.message });
      throw new GitProviderError(`Failed to list pull requests: ${err.message}`, err.status);
    }
  }

  async getCommitsForPR(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<string[]> {
    try {
      const { data } = await this.octokit.pulls.listCommits({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      });
      return data.map((c) => c.sha);
    } catch (err: any) {
      logger.error("Failed to get PR commits", { owner, repo, prNumber, error: err.message });
      throw new GitProviderError(`Failed to get PR commits: ${err.message}`, err.status);
    }
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });
      if ("content" in data && data.encoding === "base64") {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
      throw new GitProviderError("File content is not base64 encoded or is a directory");
    } catch (err: any) {
      if (err instanceof GitProviderError) throw err;
      logger.error("Failed to get file content", { owner, repo, path, error: err.message });
      throw new GitProviderError(`Failed to get file content: ${err.message}`, err.status);
    }
  }
}
