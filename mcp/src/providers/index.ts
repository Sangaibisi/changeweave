import type { GitProvider } from "./types.js";
import { GitHubProvider } from "./github.js";
import { ConfigurationError } from "../utils/errors.js";

export type ProviderType = "github" | "gitlab" | "bitbucket";

export function createProvider(type: ProviderType, token: string): GitProvider {
  switch (type) {
    case "github":
      return new GitHubProvider(token);
    case "gitlab":
      throw new ConfigurationError("GitLab provider not yet implemented (Phase 2)");
    case "bitbucket":
      throw new ConfigurationError("Bitbucket provider not yet implemented (Phase 3)");
    default:
      throw new ConfigurationError(`Unknown provider type: ${type}`);
  }
}

export { GitHubProvider } from "./github.js";
export type * from "./types.js";
