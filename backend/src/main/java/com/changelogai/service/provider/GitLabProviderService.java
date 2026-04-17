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

import com.changelogai.security.SsrfGuard;
import jakarta.annotation.PostConstruct;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@ConditionalOnProperty(name = "app.gitlab.client-id")
public class GitLabProviderService implements GitProviderService {

    private static final Logger log = LoggerFactory.getLogger(GitLabProviderService.class);

    @Value("${app.gitlab.url:https://gitlab.com}")
    private String gitlabUrl;

    @Value("${app.gitlab.client-id}")
    private String clientId;

    @Value("${app.gitlab.client-secret}")
    private String clientSecret;

    @Value("${app.public-url:http://localhost:3000}")
    private String publicUrl;

    private final RestTemplate rest = new RestTemplate();
    private final ObjectMapper om = new ObjectMapper();

    @PostConstruct
    void validateGitLabUrl() {
        if (gitlabUrl != null && !gitlabUrl.isBlank() && !gitlabUrl.equals("https://gitlab.com")) {
            SsrfGuard.validateUrl(gitlabUrl);
        }
    }

    private String api() { return gitlabUrl + "/api/v4"; }

    @Override
    public String getProviderName() { return "GITLAB"; }

    @Override
    public String getAuthorizationUrl(String userId) {
        String redirect = publicUrl + "/auth/gitlab/callback";
        return gitlabUrl + "/oauth/authorize"
                + "?client_id=" + clientId
                + "&redirect_uri=" + URLEncoder.encode(redirect, StandardCharsets.UTF_8)
                + "&response_type=code"
                + "&scope=api+read_user+read_repository"
                + "&state=" + userId;
    }

    @Override
    public String exchangeCodeForToken(String code) {
        try {
            Map<String, String> body = Map.of(
                    "client_id", clientId,
                    "client_secret", clientSecret,
                    "code", code,
                    "grant_type", "authorization_code",
                    "redirect_uri", publicUrl + "/auth/gitlab/callback");
            HttpHeaders h = new HttpHeaders();
            h.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<String> res = rest.postForEntity(gitlabUrl + "/oauth/token", new HttpEntity<>(body, h), String.class);
            JsonNode json = om.readTree(res.getBody());
            if (json.has("error")) throw new BadRequestException("GitLab OAuth error: " + json.get("error_description").asText());
            return json.get("access_token").asText();
        } catch (BadRequestException e) { throw e; }
        catch (Exception e) { throw new BadRequestException("Failed to connect GitLab."); }
    }

    @Override
    public Map<String, Object> fetchUser(String accessToken) {
        try {
            JsonNode u = get(accessToken, api() + "/user");
            Map<String, Object> user = new LinkedHashMap<>();
            user.put("id", u.get("id").asText());
            user.put("name", u.has("name") ? u.get("name").asText() : null);
            user.put("avatarUrl", u.has("avatar_url") ? u.get("avatar_url").asText() : null);
            user.put("email", u.has("email") ? u.get("email").asText() : null);
            return user;
        } catch (Exception e) { throw new BadRequestException("Failed to fetch GitLab profile."); }
    }

    @Override
    public List<Map<String, Object>> listRepos(String accessToken) {
        List<Map<String, Object>> all = new ArrayList<>();
        for (int page = 1; page <= 5; page++) {
            try {
                JsonNode projects = get(accessToken, api() + "/projects?membership=true&per_page=100&order_by=updated_at&sort=desc&page=" + page);
                if (!projects.isArray() || projects.isEmpty()) break;
                for (JsonNode p : projects) {
                    Map<String, Object> r = new LinkedHashMap<>();
                    r.put("id", p.get("id").asLong());
                    r.put("name", p.get("name").asText());
                    r.put("fullName", p.get("path_with_namespace").asText());
                    r.put("description", p.has("description") && !p.get("description").isNull() ? p.get("description").asText() : null);
                    r.put("url", p.get("web_url").asText());
                    r.put("defaultBranch", p.has("default_branch") && !p.get("default_branch").isNull() ? p.get("default_branch").asText() : "main");
                    r.put("private", "private".equals(p.get("visibility").asText()));
                    r.put("language", null);
                    r.put("updatedAt", p.get("updated_at").asText());
                    all.add(r);
                }
                if (projects.size() < 100) break;
            } catch (Exception e) { break; }
        }
        return all;
    }

    @Override
    public String createWebhook(String accessToken, String repoFullName, String secret, String callbackUrl) {
        try {
            String projectId = URLEncoder.encode(repoFullName, StandardCharsets.UTF_8);
            Map<String, Object> body = Map.of(
                    "url", callbackUrl,
                    "push_events", true,
                    "tag_push_events", true,
                    "token", secret,
                    "enable_ssl_verification", true);
            HttpHeaders h = authHeaders(accessToken);
            h.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<String> res = rest.postForEntity(api() + "/projects/" + projectId + "/hooks", new HttpEntity<>(body, h), String.class);
            return om.readTree(res.getBody()).get("id").asText();
        } catch (Exception e) { throw new BadRequestException("Failed to setup GitLab webhook."); }
    }

    @Override
    public void deleteWebhook(String accessToken, String repoFullName, String hookId) {
        try {
            String projectId = URLEncoder.encode(repoFullName, StandardCharsets.UTF_8);
            rest.exchange(api() + "/projects/" + projectId + "/hooks/" + hookId, HttpMethod.DELETE, new HttpEntity<>(authHeaders(accessToken)), Void.class);
        } catch (Exception e) { log.warn("Failed to delete GitLab webhook: {}", e.getMessage()); }
    }

    @Override
    public List<Map<String, Object>> fetchCommits(String accessToken, String repoFullName, String branch, int count) {
        try {
            String projectId = URLEncoder.encode(repoFullName, StandardCharsets.UTF_8);
            JsonNode commits = get(accessToken, api() + "/projects/" + projectId + "/repository/commits?ref_name=" + branch + "&per_page=" + count);
            List<Map<String, Object>> result = new ArrayList<>();
            for (JsonNode c : commits) {
                result.add(Map.of(
                        "sha", c.get("id").asText(),
                        "message", c.get("message").asText(),
                        "authorName", c.get("author_name").asText(),
                        "authorEmail", c.get("author_email").asText(),
                        "date", c.get("committed_date").asText()));
            }
            return result;
        } catch (Exception e) { throw new BadRequestException("Failed to fetch GitLab commits."); }
    }

    @Override
    public List<Map<String, Object>> fetchTags(String accessToken, String repoFullName) {
        try {
            String projectId = URLEncoder.encode(repoFullName, StandardCharsets.UTF_8);
            JsonNode tags = get(accessToken, api() + "/projects/" + projectId + "/repository/tags?per_page=30&order_by=updated&sort=desc");
            List<Map<String, Object>> result = new ArrayList<>();
            for (JsonNode t : tags) {
                Map<String, Object> tag = new LinkedHashMap<>();
                tag.put("name", t.get("name").asText());
                tag.put("sha", t.get("commit").get("id").asText());
                result.add(tag);
            }
            return result;
        } catch (Exception e) { return Collections.emptyList(); }
    }

    private JsonNode get(String token, String url) throws Exception {
        return om.readTree(rest.exchange(url, HttpMethod.GET, new HttpEntity<>(authHeaders(token)), String.class).getBody());
    }

    private HttpHeaders authHeaders(String token) {
        HttpHeaders h = new HttpHeaders();
        h.set("Authorization", "Bearer " + token);
        return h;
    }
}
