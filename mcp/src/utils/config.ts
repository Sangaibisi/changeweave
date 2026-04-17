export interface Config {
  github: {
    token: string;
  };
  changeweave: {
    apiUrl: string;
    apiKey: string;
  };
  context: {
    tokenBudget: number;
    defaultDepth: "summary" | "detailed" | "full";
  };
  log: {
    level: string;
  };
  cacheTtl: number;
}

export function loadConfig(): Config {
  return {
    github: {
      token: process.env.GITHUB_TOKEN ?? "",
    },
    changeweave: {
      apiUrl:
        process.env.CHANGEWEAVE_API_URL ?? "https://api.changeweave.dev",
      apiKey: process.env.CHANGEWEAVE_API_KEY ?? "",
    },
    context: {
      tokenBudget: parseInt(process.env.CONTEXT_TOKEN_BUDGET ?? "8000", 10),
      defaultDepth: (process.env.DEFAULT_DEPTH as Config["context"]["defaultDepth"]) ?? "detailed",
    },
    log: {
      level: process.env.LOG_LEVEL ?? "info",
    },
    cacheTtl: parseInt(process.env.CACHE_TTL ?? "300", 10),
  };
}
