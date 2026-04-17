package com.changelogai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * MCP Client that communicates with the ChangeWeave MCP Server
 * over Streamable HTTP (JSON-RPC 2.0 over HTTP POST).
 *
 * The MCP Server handles:
 * - GitHub API diff fetching (LOC-level)
 * - Tiered context building (summary → diffs → full file)
 * - Commit categorization (diff-aware)
 * - Impact scoring
 * - Breaking change detection
 *
 * This service simply sends tool calls and returns the results.
 */
@Service
public class McpAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(McpAnalysisService.class);

    @Value("${app.mcp.server-url:http://localhost:3100}")
    private String mcpServerUrl;

    @Value("${app.mcp.enabled:true}")
    private boolean mcpEnabled;

    @Value("${app.mcp.timeout:30000}")
    private int timeout;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final AtomicInteger requestIdCounter = new AtomicInteger(1);
    private boolean initialized = false;

    public McpAnalysisService(ObjectMapper objectMapper) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
    }

    public boolean isAvailable() {
        if (!mcpEnabled) return false;
        try {
            if (!initialized) {
                initialize();
            }
            ResponseEntity<String> response = restTemplate.getForEntity(
                    mcpServerUrl + "/health", String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.debug("MCP server not available: {}", e.getMessage());
            return false;
        }
    }

    private void initialize() {
        try {
            // Send MCP initialize request
            Map<String, Object> params = Map.of(
                    "protocolVersion", "2025-03-26",
                    "capabilities", Map.of(),
                    "clientInfo", Map.of(
                            "name", "changeweave-backend",
                            "version", "0.1.0"
                    )
            );
            JsonNode result = callMcp("initialize", params);
            if (result != null) {
                log.info("MCP server initialized: {}", result.path("serverInfo").path("name").asText());
                // Send initialized notification
                sendNotification("notifications/initialized");
                initialized = true;
            }
        } catch (Exception e) {
            log.warn("Failed to initialize MCP connection: {}", e.getMessage());
        }
    }

    /**
     * Analyze commits between two refs with LOC-level context.
     * Returns rich analysis including categories, impact scores, and module mapping.
     */
    public String analyzeCommits(String owner, String repo, String baseRef, String headRef, String depth, String token) {
        Map<String, Object> args = new java.util.HashMap<>(Map.of(
                "owner", owner,
                "repo", repo,
                "base", baseRef,
                "head", headRef,
                "depth", depth != null ? depth : "detailed",
                "max_commits", 50
        ));
        if (token != null) args.put("token", token);
        return callTool("analyze_commits", args);
    }

    public String analyzeCommits(String owner, String repo, String baseRef, String headRef, String depth) {
        return analyzeCommits(owner, repo, baseRef, headRef, depth, null);
    }

    /**
     * Generate a publication-ready changelog with full diff context.
     * This is the primary method called by ChangelogService.
     */
    public String generateChangelog(String owner, String repo, String version,
                                    String baseRef, String headRef,
                                    String style, String audience, String language,
                                    String token) {
        Map<String, Object> args = new java.util.HashMap<>(Map.of(
                "owner", owner,
                "repo", repo,
                "version", version,
                "base", baseRef,
                "head", headRef != null ? headRef : "HEAD",
                "style", style != null ? style : "user-friendly",
                "audience", audience != null ? audience : "end-users",
                "language", language != null ? language : "en",
                "include_contributors", true,
                "include_stats", false
        ));
        if (token != null) args.put("token", token);
        return callTool("generate_changelog", args);
    }

    public String generateChangelog(String owner, String repo, String version,
                                    String baseRef, String headRef,
                                    String style, String audience, String language) {
        return generateChangelog(owner, repo, version, baseRef, headRef, style, audience, language, null);
    }

    /**
     * Detect breaking changes between two refs.
     */
    public String detectBreakingChanges(String owner, String repo, String baseRef, String headRef, String token) {
        Map<String, Object> args = new java.util.HashMap<>(Map.of(
                "owner", owner,
                "repo", repo,
                "base", baseRef,
                "head", headRef
        ));
        if (token != null) args.put("token", token);
        return callTool("detect_breaking_changes", args);
    }

    public String detectBreakingChanges(String owner, String repo, String baseRef, String headRef) {
        return detectBreakingChanges(owner, repo, baseRef, headRef, null);
    }

    /**
     * Compare two refs with file-level summary.
     */
    public String compareRefs(String owner, String repo, String baseRef, String headRef, String token) {
        Map<String, Object> args = new java.util.HashMap<>(Map.of(
                "owner", owner,
                "repo", repo,
                "base", baseRef,
                "head", headRef,
                "include_diffs", false
        ));
        if (token != null) args.put("token", token);
        return callTool("compare_refs", args);
    }

    public String compareRefs(String owner, String repo, String baseRef, String headRef) {
        return compareRefs(owner, repo, baseRef, headRef, null);
    }

    // ─── Internal MCP Protocol Methods ────────────────────────

    private String callTool(String toolName, Map<String, Object> arguments) {
        try {
            if (!initialized) {
                initialize();
            }

            Map<String, Object> params = Map.of(
                    "name", toolName,
                    "arguments", arguments
            );
            JsonNode result = callMcp("tools/call", params);
            if (result != null && result.has("content")) {
                JsonNode content = result.get("content");
                if (content.isArray() && !content.isEmpty()) {
                    return content.get(0).path("text").asText("");
                }
            }
            log.warn("Empty response from MCP tool: {}", toolName);
            return null;
        } catch (Exception e) {
            log.error("MCP tool call failed: {} — {}", toolName, e.getMessage());
            return null;
        }
    }

    private JsonNode callMcp(String method, Map<String, Object> params) {
        ObjectNode request = objectMapper.createObjectNode();
        request.put("jsonrpc", "2.0");
        request.put("id", requestIdCounter.getAndIncrement());
        request.put("method", method);
        request.set("params", objectMapper.valueToTree(params));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept", "application/json, text/event-stream");

        HttpEntity<String> entity;
        try {
            entity = new HttpEntity<>(objectMapper.writeValueAsString(request), headers);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize MCP request", e);
        }

        String url = mcpServerUrl + "/mcp";
        log.debug("MCP request → {} {}: {}", url, method, params);

        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.POST, entity, String.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("MCP server returned " + response.getStatusCode());
        }

        try {
            // MCP Streamable HTTP returns SSE format: "event: message\ndata: {...}\n"
            String body = response.getBody();
            String jsonPayload = extractJsonFromSse(body);

            JsonNode responseJson = objectMapper.readTree(jsonPayload);
            if (responseJson.has("error")) {
                String errorMsg = responseJson.path("error").path("message").asText("Unknown MCP error");
                throw new RuntimeException("MCP error: " + errorMsg);
            }
            return responseJson.path("result");
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse MCP response", e);
        }
    }

    /**
     * Extract JSON payload from SSE format.
     * SSE response looks like: "event: message\ndata: {json}\n\n"
     * If response is already plain JSON, returns as-is.
     */
    private String extractJsonFromSse(String body) {
        if (body.trim().startsWith("{")) {
            return body;
        }
        for (String line : body.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
                return trimmed.substring(6);
            }
        }
        throw new RuntimeException("No JSON data found in MCP SSE response");
    }

    private void sendNotification(String method) {
        try {
            ObjectNode notification = objectMapper.createObjectNode();
            notification.put("jsonrpc", "2.0");
            notification.put("method", method);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(
                    objectMapper.writeValueAsString(notification), headers);
            restTemplate.exchange(mcpServerUrl + "/mcp", HttpMethod.POST, entity, String.class);
        } catch (Exception e) {
            log.debug("MCP notification failed: {}", e.getMessage());
        }
    }
}
