export interface ChangelogDto {
  id: string;
  version: string;
  title: string;
  content?: string;
  summary?: string;
  slug: string;
  isDraft: boolean;
  publishedAt?: string;
  createdAt: string;
  publicUrl?: string;
}

export interface RepoDto {
  id: string;
  name: string;
  fullName: string;
  slug: string;
  provider: string;
  isActive: boolean;
  defaultBranch: string;
}

export interface CreateChangelogDto {
  version: string;
  title: string;
  content?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
