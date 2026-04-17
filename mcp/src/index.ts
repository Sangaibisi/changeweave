#!/usr/bin/env node

import { createServer } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./utils/config.js";
import { setLogLevel, logger } from "./utils/logger.js";
import { createProvider } from "./providers/index.js";
import { createChangeWeaveClient } from "./client/index.js";
import { createMcpServer } from "./server.js";
import { ConfigurationError } from "./utils/errors.js";

async function main(): Promise<void> {
  const config = loadConfig();
  setLogLevel(config.log.level);

  const transportMode = process.env.MCP_TRANSPORT ?? "stdio";
  logger.info(`Starting ChangeWeave MCP Server (transport: ${transportMode})...`);

  // Create default GitHub provider (optional — used as fallback for IDE/stdio mode)
  const defaultProvider = config.github.token
    ? createProvider("github", config.github.token)
    : null;

  if (defaultProvider) {
    logger.info("Default GitHub provider initialized (from GITHUB_TOKEN env)");
  } else {
    logger.info("No default GITHUB_TOKEN set — tools will require per-request token");
  }

  // Create ChangeWeave backend client
  const client = createChangeWeaveClient(
    config.changeweave.apiUrl,
    config.changeweave.apiKey,
  );

  if (config.changeweave.apiKey) {
    logger.info("ChangeWeave backend client initialized");
  } else {
    logger.warn(
      "CHANGEWEAVE_API_KEY not set. Backend features (list/publish changelogs) will be unavailable.",
    );
  }

  if (transportMode === "http") {
    // HTTP mode — for Java backend (MCP Client) connectivity
    const port = parseInt(process.env.MCP_PORT ?? "3100", 10);

    const httpServer = createServer(async (req, res) => {
      // CORS headers for backend access
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Health check
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", transport: "http" }));
        return;
      }

      // MCP endpoint — stateless: new transport per request
      if (req.url === "/mcp") {
        try {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // stateless
          });
          const server = createMcpServer(config, defaultProvider, client);
          await server.connect(transport);
          await transport.handleRequest(req, res);
        } catch (err) {
          logger.error("MCP request handling failed", { error: (err as Error).message });
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        }
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    httpServer.listen(port, () => {
      logger.info(`ChangeWeave MCP Server running on http://0.0.0.0:${port}/mcp`);
    });
  } else {
    // stdio mode — for IDE clients (Windsurf, Cursor)
    if (!defaultProvider) {
      throw new ConfigurationError("GITHUB_TOKEN is required for stdio mode (IDE usage).");
    }
    const mcpServer = createMcpServer(config, defaultProvider, client);
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);

    logger.info("ChangeWeave MCP Server running on stdio");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
