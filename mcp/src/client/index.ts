import { BackendApiError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import type {
  ChangelogDto,
  RepoDto,
  CreateChangelogDto,
  ApiResponse,
} from "./types.js";

export interface ChangeWeaveClient {
  listRepos(): Promise<RepoDto[]>;
  getRepo(repoId: string): Promise<RepoDto>;
  listChangelogs(repoId: string, status: string, limit: number): Promise<ChangelogDto[]>;
  createChangelog(repoId: string, data: CreateChangelogDto): Promise<ChangelogDto>;
  publishChangelog(changelogId: string): Promise<ChangelogDto>;
}

export function createChangeWeaveClient(apiUrl: string, apiKey: string): ChangeWeaveClient {
  let accessToken: string | null = null;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!accessToken && apiKey) {
      await authenticate();
    }

    const url = `${apiUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new BackendApiError(`API error ${res.status}: ${text}`, res.status);
      }

      const json = (await res.json()) as ApiResponse<T>;
      if (json.data !== undefined) {
        return json.data;
      }
      return json as unknown as T;
    } catch (err) {
      if (err instanceof BackendApiError) throw err;
      throw new BackendApiError(`Network error: ${(err as Error).message}`);
    }
  }

  async function authenticate(): Promise<void> {
    try {
      const res = await fetch(`${apiUrl}/api/auth/api-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!res.ok) {
        logger.warn("API key authentication failed, some features may be unavailable");
        return;
      }

      const json = (await res.json()) as { accessToken: string };
      accessToken = json.accessToken;
      logger.info("Authenticated with ChangeWeave backend");
    } catch {
      logger.warn("Could not connect to ChangeWeave backend");
    }
  }

  return {
    async listRepos(): Promise<RepoDto[]> {
      return request<RepoDto[]>("GET", "/api/repos");
    },

    async getRepo(repoId: string): Promise<RepoDto> {
      return request<RepoDto>("GET", `/api/repos/${repoId}`);
    },

    async listChangelogs(
      repoId: string,
      status: string,
      limit: number,
    ): Promise<ChangelogDto[]> {
      const query = status !== "all" ? `?status=${status}&limit=${limit}` : `?limit=${limit}`;
      return request<ChangelogDto[]>("GET", `/api/repos/${repoId}/changelogs${query}`);
    },

    async createChangelog(
      repoId: string,
      data: CreateChangelogDto,
    ): Promise<ChangelogDto> {
      return request<ChangelogDto>("POST", `/api/repos/${repoId}/changelogs`, data);
    },

    async publishChangelog(changelogId: string): Promise<ChangelogDto> {
      return request<ChangelogDto>("POST", `/api/changelogs/${changelogId}/publish`);
    },
  };
}

export type { ChangelogDto, RepoDto, CreateChangelogDto } from "./types.js";
