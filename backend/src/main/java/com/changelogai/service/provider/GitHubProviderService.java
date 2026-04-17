package com.changelogai.service.provider;

import com.changelogai.exception.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@ConditionalOnProperty(name = "app.github.client-id")
public class GitHubProviderService implements GitProviderService {

    private static final Logger log = LoggerFactory.getLogger(GitHubProviderService.class);
    private static final String API = "https://api.github.com";

    @Value("${app.github.client-id}")
    private String clientId;

    @Value("${app.github.client-secret}")
    private String clientSecret;

    @Value("${app.public-url:http://localhost:3000}")
    private String publicUrl;

    private final RestTemplate rest = new RestTemplate();
    private final ObjectMapper om = new ObjectMapper();

    @Override
    public String getProviderName() { return "GITHUB"; }

    @Override
    public String getAuthorizationUrl(String userId) {
        return "https://github.com/login/oauth/authorize"
                + "?client_id=" + clientId
                + "&redirect_uri=" + publicUrl + "/auth/github/callback"
                + "&scope=repo,read:user,user:email,read:org"
                + "&state=" + userId;
    }

    @Override
    public String exchangeCodeForToken(String code) {
        try {
            Map<String, String> body = Map.of("client_id", clientId, "client_secret", clientSecret, "code", code);
            HttpHeaders h = new HttpHeaders();
            h.setContentType(MediaType.APPLICATION_JSON);
            h.set("Accept", "application/json");
            ResponseEntity<String> res = rest.postForEntity("https://github.com/login/oauth/access_token", new HttpEntity<>(body, h), String.class);
            JsonNode json = om.readTree(res.getBody());
            if (json.has("error")) throw new BadRequestException("GitHub OAuth error: " + json.get("error_description").asText());
            return json.get("access_token").asText();
        } catch (BadRequestException e) { throw e; }
        catch (Exception e) { throw new BadRequestException("Failed to connect GitHub."); }
    }

    @Override
    public Map<String, Object> fetchUser(String accessToken) {
        try {
            JsonNode u = get(accessToken, API + "/user");
            Map<String, Object> user = new LinkedHashMap<>();
            user.put("id", u.get("id").asText());
            user.put("name", u.has("name") && !u.get("name").isNull() ? u.get("name").asText() : null);
            user.put("avatarUrl", u.has("avatar_url") ? u.get("avatar_url").asText() : null);
            user.put("email", u.has("email") && !u.get("email").isNull() ? u.get("email").asText() : null);
            return user;
        } catch (Exception e) { throw new BadRequestException("Failed to fetch GitHub profile."); }
    }

    @Override
    public List<Map<String, Object>> listRepos(String accessToken) {
        Set<Long> seen = new HashSet<>();
        List<Map<String, Object>> all = new ArrayList<>();
        fetchPages(accessToken, API + "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", all, seen);
        try {
            JsonNode orgs = get(accessToken, API + "/user/orgs?per_page=100");
            if (orgs.isArray()) {
                for (JsonNode org : orgs) {
                    fetchPages(accessToken, API + "/orgs/" + org.get("login").asText() + "/repos?per_page=100&sort=updated&type=all", all, seen);
                }
            }
        } catch (Exception e) { log.warn("Failed to fetch org repos: {}", e.getMessage()); }
        all.sort((a, b) -> String.valueOf(b.get("updatedAt")).compareTo(String.valueOf(a.get("updatedAt"))));
        return all;
    }

    @Override
    public String createWebhook(String accessToken, String repoFullName, String secret, String callbackUrl) {
        try {
            Map<String, Object> body = Map.of(
                    "name", "web", "active", true,
                    "events", List.of("push", "create", "release"),
                    "config", Map.of("url", callbackUrl, "content_type", "json", "secret", secret, "insecure_ssl", "0"));
            HttpHeaders h = authHeaders(accessToken);
            h.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<String> res = rest.postForEntity(API + "/repos/" + repoFullName + "/hooks", new HttpEntity<>(body, h), String.class);
            return om.readTree(res.getBody()).get("id").asText();
        } catch (Exception e) { throw new BadRequestException("Failed to setup GitHub webhook."); }
    }

    @Override
    public void deleteWebhook(String accessToken, String repoFullName, String hookId) {
        try {
            rest.exchange(API + "/repos/" + repoFullName + "/hooks/" + hookId, HttpMethod.DELETE, new HttpEntity<>(authHeaders(accessToken)), Void.class);
        } catch (Exception e) { log.warn("Failed to delete GitHub webhook: {}", e.getMessage()); }
    }

    @Override
    public List<Map<String, Object>> fetchCommits(String accessToken, String repoFullName, String branch, int count) {
        try {
            JsonNode commits = get(accessToken, API + "/repos/" + repoFullName + "/commits?sha=" + branch + "&per_page=" + count);
            List<Map<String, Object>> result = new ArrayList<>();
            for (JsonNode c : commits) {
                JsonNode cd = c.get("commit");
                JsonNode author = cd.get("author");
                result.add(Map.of(
                        "sha", c.get("sha").asText(),
                        "message", cd.get("message").asText(),
                        "authorName", author.get("name").asText(),
                        "authorEmail", author.get("email").asText(),
                        "date", author.get("date").asText()));
            }
            return result;
        } catch (Exception e) { throw new BadRequestException("Failed to fetch GitHub commits."); }
    }

    @Override
    public List<Map<String, Object>> fetchTags(String accessToken, String repoFullName) {
        try {
            JsonNode tags = get(accessToken, API + "/repos/" + repoFullName + "/tags?per_page=30");
            List<Map<String, Object>> result = new ArrayList<>();
            for (JsonNode t : tags) {
                Map<String, Object> tag = new LinkedHashMap<>();
                tag.put("name", t.get("name").asText());
                tag.put("sha", t.get("commit").get("sha").asText());
                result.add(tag);
            }
            return result;
        } catch (Exception e) {
            log.warn("Failed to fetch tags for {}: {}", repoFullName, e.getMessage());
            return Collections.emptyList();
        }
    }

    private void fetchPages(String token, String baseUrl, List<Map<String, Object>> all, Set<Long> seen) {
        for (int page = 1; page <= 5; page++) {
            try {
                String sep = baseUrl.contains("?") ? "&" : "?";
                JsonNode repos = get(token, baseUrl + sep + "page=" + page);
                if (!repos.isArray() || repos.isEmpty()) break;
                for (JsonNode r : repos) {
                    long id = r.get("id").asLong();
                    if (seen.contains(id)) continue;
                    seen.add(id);
                    all.add(toRepoMap(r));
                }
                if (repos.size() < 100) break;
            } catch (Exception e) { break; }
        }
    }

    private Map<String, Object> toRepoMap(JsonNode r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.get("id").asLong());
        m.put("name", r.get("name").asText());
        m.put("fullName", r.get("full_name").asText());
        m.put("description", r.has("description") && !r.get("description").isNull() ? r.get("description").asText() : null);
        m.put("url", r.get("html_url").asText());
        m.put("defaultBranch", r.get("default_branch").asText());
        m.put("private", r.get("private").asBoolean());
        m.put("language", r.has("language") && !r.get("language").isNull() ? r.get("language").asText() : null);
        m.put("updatedAt", r.get("updated_at").asText());
        return m;
    }

    private JsonNode get(String token, String url) throws Exception {
        return om.readTree(rest.exchange(url, HttpMethod.GET, new HttpEntity<>(authHeaders(token)), String.class).getBody());
    }

    private HttpHeaders authHeaders(String token) {
        HttpHeaders h = new HttpHeaders();
        h.set("Authorization", "Bearer " + token);
        h.set("Accept", "application/vnd.github+json");
        h.set("X-GitHub-Api-Version", "2022-11-28");
        return h;
    }
}
