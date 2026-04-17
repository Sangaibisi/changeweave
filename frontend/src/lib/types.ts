export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  planType: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  emailVerified: boolean;
  githubConnected: boolean;
  gitlabConnected: boolean;
  bitbucketConnected: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export type RepoVisibility = "PUBLIC" | "TOKEN_PROTECTED" | "PRIVATE";

export interface Repo {
  id: string;
  name: string;
  fullName: string;
  provider: "GITHUB" | "GITLAB" | "BITBUCKET";
  providerRepoUrl: string;
  defaultBranch: string;
  description: string | null;
  slug: string;
  visibility: RepoVisibility;
  accessToken: string | null;
  isActive: boolean;
  changelogCount: number;
  unprocessedCommitCount: number;
  settings: Record<string, unknown> | null;
  createdAt: string;
}

export interface Changelog {
  id: string;
  repositoryId: string;
  repositoryName: string;
  version: string;
  title: string;
  summary: string | null;
  content: string | null;
  slug: string;
  draft: boolean;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  categories: ChangelogCategory[];
}

export interface ChangelogCategory {
  category: string;
  title: string;
  items: unknown[];
  sortOrder: number;
}

export interface Commit {
  id: string;
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  category: string;
  impactScore: string;
  aiTransformedText: string | null;
  isProcessed: boolean;
  committedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
