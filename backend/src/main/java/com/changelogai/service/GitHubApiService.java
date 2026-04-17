package com.changelogai.service;

import com.changelogai.exception.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.HashSet;
import java.util.Set;

@Service
public class GitHubApiService {

    private static final Logger log = LoggerFactory.getLogger(GitHubApiService.class);
    private static final String GITHUB_API = "https://api.github.com";

    @Value("${app.public-url:http://localhost:8080}")
    private String apiPublicUrl;

    @Value("${app.github.webhook-secret:}")
    private String webhookSecret;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GitHubApiService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public List<Map<String, Object>> listUserRepos(String accessToken) {
        try {
            // Fetch authenticated user's login
            String currentUserLogin = "";
            try {
                HttpEntity<Void> userReq = authEntity(accessToken);
                ResponseEntity<String> userRes = restTemplate.exchange(
                        GITHUB_API + "/user", HttpMethod.GET, userReq, String.class);
                JsonNode userNode = objectMapper.readTree(userRes.getBody());
                currentUserLogin = userNode.get("login").asText();
            } catch (Exception e) {
                log.warn("Failed to fetch current user login: {}", e.getMessage());
            }

            Set<Long> seenIds = new HashSet<>();
            List<Map<String, Object>> allRepos = new ArrayList<>();

            // 1) Personal + collaborator + org member repos
            fetchPaginatedRepos(accessToken, GITHUB_API + "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", allRepos, seenIds, currentUserLogin);

            // 2) Explicitly fetch repos for each org (catches admin/owner repos that affiliation may miss)
            try {
                HttpEntity<Void> orgReq = authEntity(accessToken);
                ResponseEntity<String> orgRes = restTemplate.exchange(
                        GITHUB_API + "/user/orgs?per_page=100", HttpMethod.GET, orgReq, String.class);
                JsonNode orgs = objectMapper.readTree(orgRes.getBody());
                if (orgs.isArray()) {
                    for (JsonNode org : orgs) {
                        String orgLogin = org.get("login").asText();
                        fetchPaginatedRepos(accessToken, GITHUB_API + "/orgs/" + orgLogin + "/repos?per_page=100&sort=updated&type=all", allRepos, seenIds, currentUserLogin);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch org repos: {}", e.getMessage());
            }

            allRepos.sort((a, b) -> String.valueOf(b.get("updatedAt")).compareTo(String.valueOf(a.get("updatedAt"))));
            log.info("Fetched {} GitHub repos (personal + orgs)", allRepos.size());
            return allRepos;
        } catch (Exception e) {
            log.error("Failed to list GitHub repos", e);
            throw new BadRequestException("Failed to fetch GitHub repositories. Please reconnect your GitHub account.");
        }
    }

    private void fetchPaginatedRepos(String accessToken, String baseUrl, List<Map<String, Object>> allRepos, Set<Long> seenIds, String currentUserLogin) {
        int page = 1;
        while (page <= 5) {
            try {
                String separator = baseUrl.contains("?") ? "&" : "?";
                HttpEntity<Void> request = authEntity(accessToken);
                ResponseEntity<String> response = restTemplate.exchange(
                        baseUrl + separator + "page=" + page, HttpMethod.GET, request, String.class);

                JsonNode repos = objectMapper.readTree(response.getBody());
                if (!repos.isArray() || repos.isEmpty()) break;

                for (JsonNode repo : repos) {
                    long repoId = repo.get("id").asLong();
                    if (seenIds.contains(repoId)) continue;
                    seenIds.add(repoId);

                    JsonNode owner = repo.get("owner");
                    String ownerLogin = owner != null ? owner.get("login").asText() : "";
                    String ownerType = owner != null ? owner.get("type").asText() : "User";
                    String ownerAvatarUrl = owner != null && owner.has("avatar_url")
                            ? owner.get("avatar_url").asText() : null;

                    String role;
                    if (ownerLogin.equalsIgnoreCase(currentUserLogin)) {
                        role = "owner";
                    } else if ("Organization".equals(ownerType)) {
                        role = "organization";
                    } else {
                        role = "collaborator";
                    }

                    Map<String, Object> r = new LinkedHashMap<>();
                    r.put("id", repoId);
                    r.put("name", repo.get("name").asText());
                    r.put("fullName", repo.get("full_name").asText());
                    r.put("description", repo.has("description") && !repo.get("description").isNull()
                            ? repo.get("description").asText() : null);
                    r.put("url", repo.get("html_url").asText());
                    r.put("defaultBranch", repo.get("default_branch").asText());
                    r.put("private", repo.get("private").asBoolean());
                    r.put("language", repo.has("language") && !repo.get("language").isNull()
                            ? repo.get("language").asText() : null);
                    r.put("updatedAt", repo.get("updated_at").asText());
                    r.put("ownerLogin", ownerLogin);
                    r.put("ownerAvatarUrl", ownerAvatarUrl);
                    r.put("ownerType", ownerType);
                    r.put("role", role);
                    allRepos.add(r);
                }

                if (repos.size() < 100) break;
                page++;
            } catch (Exception e) {
                log.warn("Failed to fetch page {} from {}: {}", page, baseUrl, e.getMessage());
                break;
            }
        }
    }

    public String createWebhook(String accessToken, String repoFullName, String secret) {
        try {
            String callbackUrl = apiPublicUrl + "/api/webhooks/github";

            Map<String, Object> config = Map.of(
                    "url", callbackUrl,
                    "content_type", "json",
                    "secret", secret,
                    "insecure_ssl", "0"
            );

            Map<String, Object> body = Map.of(
                    "name", "web",
                    "active", true,
                    "events", List.of("push", "create", "release"),
                    "config", config
            );

            HttpHeaders headers = authHeaders(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    GITHUB_API + "/repos/" + repoFullName + "/hooks",
                    request, String.class);

            JsonNode json = objectMapper.readTree(response.getBody());
            String hookId = json.get("id").asText();
            log.info("Webhook created for {} (id={})", repoFullName, hookId);
            return hookId;
        } catch (Exception e) {
            log.error("Failed to create webhook for {}", repoFullName, e);
            throw new BadRequestException("Failed to setup webhook. Make sure you have admin access to this repository.");
        }
    }

    public void deleteWebhook(String accessToken, String repoFullName, String hookId) {
        try {
            HttpEntity<Void> request = authEntity(accessToken);
            restTemplate.exchange(
                    GITHUB_API + "/repos/" + repoFullName + "/hooks/" + hookId,
                    HttpMethod.DELETE, request, Void.class);
            log.info("Webhook deleted for {} (id={})", repoFullName, hookId);
        } catch (Exception e) {
            log.warn("Failed to delete webhook for {} (id={}): {}", repoFullName, hookId, e.getMessage());
        }
    }

    public List<Map<String, Object>> fetchRecentCommits(String accessToken, String repoFullName, String branch, int count) {
        try {
            HttpEntity<Void> request = authEntity(accessToken);
            ResponseEntity<String> response = restTemplate.exchange(
                    GITHUB_API + "/repos/" + repoFullName + "/commits?sha=" + branch + "&per_page=" + count,
                    HttpMethod.GET, request, String.class);

            JsonNode commits = objectMapper.readTree(response.getBody());
            List<Map<String, Object>> result = new ArrayList<>();

            for (JsonNode c : commits) {
                Map<String, Object> commit = new LinkedHashMap<>();
                commit.put("sha", c.get("sha").asText());

                JsonNode commitData = c.get("commit");
                commit.put("message", commitData.get("message").asText());

                JsonNode author = commitData.get("author");
                commit.put("authorName", author.get("name").asText());
                commit.put("authorEmail", author.get("email").asText());
                commit.put("date", author.get("date").asText());

                result.add(commit);
            }

            log.info("Fetched {} commits from {}/{}", result.size(), repoFullName, branch);
            return result;
        } catch (Exception e) {
            log.error("Failed to fetch commits for {}", repoFullName, e);
            throw new BadRequestException("Failed to fetch commits from GitHub.");
        }
    }

    private HttpEntity<Void> authEntity(String accessToken) {
        return new HttpEntity<>(authHeaders(accessToken));
    }

    private HttpHeaders authHeaders(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        headers.set("Accept", "application/vnd.github+json");
        headers.set("X-GitHub-Api-Version", "2022-11-28");
        return headers;
    }
}
