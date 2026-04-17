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
import java.util.*;

@Service
@ConditionalOnProperty(name = "app.bitbucket-dc.url")
public class BitbucketDCProviderService implements GitProviderService {

    private static final Logger log = LoggerFactory.getLogger(BitbucketDCProviderService.class);

    @Value("${app.bitbucket-dc.url}")
    private String baseUrl;

    private final RestTemplate rest = new RestTemplate();
    private final ObjectMapper om = new ObjectMapper();

    @PostConstruct
    void validateBaseUrl() {
        if (baseUrl != null && !baseUrl.isBlank()) {
            SsrfGuard.validateUrl(baseUrl);
        }
    }

    private String api() { return baseUrl + "/rest/api/1.0"; }

    @Override
    public String getProviderName() { return "BITBUCKET_DC"; }

    @Override
    public String getAuthorizationUrl(String userId) {
        throw new BadRequestException("Bitbucket Data Center uses Personal Access Tokens. No OAuth flow needed. Configure token in settings.");
    }

    @Override
    public String exchangeCodeForToken(String code) {
        throw new BadRequestException("Bitbucket DC uses PAT auth, not OAuth.");
    }

    @Override
    public Map<String, Object> fetchUser(String accessToken) {
        try {
            JsonNode u = get(accessToken, api() + "/users/" + getUsername(accessToken));
            Map<String, Object> user = new LinkedHashMap<>();
            user.put("id", u.get("id").asText());
            user.put("name", u.get("displayName").asText());
            user.put("avatarUrl", null);
            user.put("email", u.has("emailAddress") ? u.get("emailAddress").asText() : null);
            return user;
        } catch (Exception e) { throw new BadRequestException("Failed to fetch Bitbucket DC profile."); }
    }

    @Override
    public List<Map<String, Object>> listRepos(String accessToken) {
        List<Map<String, Object>> all = new ArrayList<>();
        int start = 0;
        for (int i = 0; i < 5; i++) {
            try {
                JsonNode json = get(accessToken, api() + "/repos?limit=100&start=" + start);
                JsonNode values = json.get("values");
                if (values == null || !values.isArray() || values.isEmpty()) break;
                for (JsonNode r : values) {
                    String project = r.get("project").get("key").asText();
                    String slug = r.get("slug").asText();
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", r.get("id").asLong());
                    m.put("name", r.get("name").asText());
                    m.put("fullName", project + "/" + slug);
                    m.put("description", r.has("description") ? r.get("description").asText() : null);
                    m.put("url", baseUrl + "/projects/" + project + "/repos/" + slug);
                    m.put("defaultBranch", "main");
                    m.put("private", !r.get("public").asBoolean());
                    m.put("language", null);
                    m.put("updatedAt", "");
                    all.add(m);
                }
                if (json.has("isLastPage") && json.get("isLastPage").asBoolean()) break;
                start = json.has("nextPageStart") ? json.get("nextPageStart").asInt() : start + 100;
            } catch (Exception e) { break; }
        }
        return all;
    }

    @Override
    public String createWebhook(String accessToken, String repoFullName, String secret, String callbackUrl) {
        try {
            String[] parts = repoFullName.split("/");
            Map<String, Object> body = Map.of(
                    "name", "ChangelogAI",
                    "url", callbackUrl,
                    "active", true,
                    "events", List.of("repo:refs_changed"));
            HttpHeaders h = authHeaders(accessToken);
            h.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<String> res = rest.postForEntity(
                    api() + "/projects/" + parts[0] + "/repos/" + parts[1] + "/webhooks",
                    new HttpEntity<>(body, h), String.class);
            return om.readTree(res.getBody()).get("id").asText();
        } catch (Exception e) { throw new BadRequestException("Failed to setup Bitbucket DC webhook."); }
    }

    @Override
    public void deleteWebhook(String accessToken, String repoFullName, String hookId) {
        try {
            String[] parts = repoFullName.split("/");
            rest.exchange(api() + "/projects/" + parts[0] + "/repos/" + parts[1] + "/webhooks/" + hookId,
                    HttpMethod.DELETE, new HttpEntity<>(authHeaders(accessToken)), Void.class);
        } catch (Exception e) { log.warn("Failed to delete Bitbucket DC webhook: {}", e.getMessage()); }
    }

    @Override
    public List<Map<String, Object>> fetchCommits(String accessToken, String repoFullName, String branch, int count) {
        try {
            String[] parts = repoFullName.split("/");
            JsonNode json = get(accessToken, api() + "/projects/" + parts[0] + "/repos/" + parts[1] + "/commits?until=" + branch + "&limit=" + count);
            JsonNode values = json.get("values");
            List<Map<String, Object>> result = new ArrayList<>();
            if (values != null && values.isArray()) {
                for (JsonNode c : values) {
                    result.add(Map.of(
                            "sha", c.get("id").asText(),
                            "message", c.get("message").asText(),
                            "authorName", c.has("author") ? c.get("author").get("name").asText() : "Unknown",
                            "authorEmail", c.has("author") && c.get("author").has("emailAddress") ? c.get("author").get("emailAddress").asText() : "",
                            "date", String.valueOf(c.get("authorTimestamp").asLong())));
                }
            }
            return result;
        } catch (Exception e) { throw new BadRequestException("Failed to fetch Bitbucket DC commits."); }
    }

    @Override
    public List<Map<String, Object>> fetchTags(String accessToken, String repoFullName) {
        try {
            String[] parts = repoFullName.split("/");
            JsonNode json = get(accessToken, api() + "/projects/" + parts[0] + "/repos/" + parts[1] + "/tags?limit=30&orderBy=MODIFICATION");
            JsonNode values = json.get("values");
            List<Map<String, Object>> result = new ArrayList<>();
            if (values != null && values.isArray()) {
                for (JsonNode t : values) {
                    Map<String, Object> tag = new LinkedHashMap<>();
                    tag.put("name", t.get("displayId").asText());
                    tag.put("sha", t.get("latestCommit").asText());
                    result.add(tag);
                }
            }
            return result;
        } catch (Exception e) { return Collections.emptyList(); }
    }

    private String getUsername(String token) {
        try {
            JsonNode json = get(token, baseUrl + "/rest/api/1.0/application-properties");
            return "admin";
        } catch (Exception e) { return "admin"; }
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
