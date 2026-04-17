export type CommitCategory =
  | "NEW_FEATURE"
  | "BUG_FIX"
  | "IMPROVEMENT"
  | "PERFORMANCE"
  | "BREAKING_CHANGE"
  | "DEPRECATION"
  | "DOCUMENTATION"
  | "CHORE"
  | "OTHER";

export type ImpactScore = "HIGH" | "MEDIUM" | "LOW";

export type FileStatus = "added" | "modified" | "deleted" | "renamed" | "copied";

export interface CommitInfo {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  date: string;
  filesChanged: FileChangeInfo[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface FileChangeInfo {
  filename: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  patch?: string;
  previousFilename?: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface CommitDiff {
  sha: string;
  message: string;
  authorName: string;
  date: string;
  files: FileDiff[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface FileDiff {
  filename: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  previousFilename?: string;
}

export interface BranchComparison {
  baseRef: string;
  headRef: string;
  aheadBy: number;
  behindBy: number;
  totalCommits: number;
  commits: CommitInfo[];
  files: FileChangeInfo[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface RepoInfo {
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  private: boolean;
  stars: number;
  openIssues: number;
  updatedAt: string;
}

export interface PullRequestInfo {
  number: number;
  title: string;
  body: string | null;
  authorLogin: string;
  mergedAt: string;
  mergeCommitSha: string | null;
  labels: string[];
  commitShas: string[];
}

export interface GitProvider {
  getRepoInfo(owner: string, repo: string): Promise<RepoInfo>;
  listCommits(
    owner: string,
    repo: string,
    options?: { sha?: string; since?: string; until?: string; perPage?: number },
  ): Promise<CommitInfo[]>;
  getCommitDiff(owner: string, repo: string, sha: string): Promise<CommitDiff>;
  compareRefs(owner: string, repo: string, base: string, head: string): Promise<BranchComparison>;
  listTags(owner: string, repo: string, perPage?: number): Promise<{ name: string; sha: string }[]>;
  getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string>;
  listMergedPullRequests(
    owner: string,
    repo: string,
    options?: { base?: string; since?: string; perPage?: number },
  ): Promise<PullRequestInfo[]>;
  getCommitsForPR(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<string[]>;
}
