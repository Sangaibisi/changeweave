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
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@ConditionalOnProperty(name = "app.bitbucket.client-id")
public class BitbucketCloudProviderService implements GitProviderService {

    private static final Logger log = LoggerFactory.getLogger(BitbucketCloudProviderService.class);
    private static final String API = "https://api.bitbucket.org/2.0";

    @Value("${app.bitbucket.client-id}")
    private String clientId;

    @Value("${app.bitbucket.client-secret}")
    private String clientSecret;

    @Value("${app.public-url:http://localhost:3000}")
    private String publicUrl;

    private final RestTemplate rest = new RestTemplate();
    private final ObjectMapper om = new ObjectMapper();

    @Override
    public String getProviderName() { return "BITBUCKET"; }

    @Override
    public String getAuthorizationUrl(String userId) {
        return "https://bitbucket.org/site/oauth2/authorize"
                + "?client_id=" + clientId
                + "&response_type=code"
                + "&state=" + userId;
    }

    @Override
    public String exchangeCodeForToken(String code) {
        try {
            HttpHeaders h = new HttpHeaders();
            h.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            h.setBasicAuth(clientId, clientSecret);
            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("grant_type", "authorization_code");
            body.add("code", code);
            ResponseEntity<String> res = rest.postForEntity("https://bitbucket.org/site/oauth2/access_token", new HttpEntity<>(body, h), String.class);
            JsonNode json = om.readTree(res.getBody());
            if (json.has("error")) throw new BadRequestException("Bitbucket OAuth error: " + json.get("error_description").asText());
            return json.get("access_token").asText();
        } catch (BadRequestException e) { throw e; }
        catch (Exception e) { throw new BadRequestException("Failed to connect Bitbucket."); }
    }

    @Override
    public Map<String, Object> fetchUser(String accessToken) {
        try {
            JsonNode u = get(accessToken, API + "/user");
            Map<String, Object> user = new LinkedHashMap<>();
            user.put("id", u.get("uuid").asText());
            user.put("name", u.get("display_name").asText());
            user.put("avatarUrl", u.has("links") && u.get("links").has("avatar") ? u.get("links").get("avatar").get("href").asText() : null);
            user.put("email", null);
            return user;
        } catch (Exception e) { throw new BadRequestException("Failed to fetch Bitbucket profile."); }
    }

    @Override
    public List<Map<String, Object>> listRepos(String accessToken) {
        List<Map<String, Object>> all = new ArrayList<>();
        String url = API + "/repositories?role=member&pagelen=100&sort=-updated_on";
        for (int page = 0; page < 5 && url != null; page++) {
            try {
                JsonNode json = get(accessToken, url);
                JsonNode repos = json.get("values");
                if (repos == null || !repos.isArray()) break;
                for (JsonNode r : repos) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", r.get("uuid").asText().hashCode() & 0xFFFFFFFFL);
                    m.put("name", r.get("name").asText());
                    m.put("fullName", r.get("full_name").asText());
                    m.put("description", r.has("description") && !r.get("description").isNull() ? r.get("description").asText() : null);
                    m.put("url", r.get("links").get("html").get("href").asText());
                    m.put("defaultBranch", r.has("mainbranch") && !r.get("mainbranch").isNull() ? r.get("mainbranch").get("name").asText() : "main");
                    m.put("private", r.get("is_private").asBoolean());
                    m.put("language", r.has("language") && !r.get("language").isNull() ? r.get("language").asText() : null);
                    m.put("updatedAt", r.get("updated_on").asText());
                    all.add(m);
                }
                url = json.has("next") && !json.get("next").isNull() ? json.get("next").asText() : null;
            } catch (Exception e) { break; }
        }
        return all;
    }

    @Override
    public String createWebhook(String accessToken, String repoFullName, String secret, String callbackUrl) {
        try {
            Map<String, Object> body = Map.of(
                    "description", "ChangelogAI",
                    "url", callbackUrl,
                    "active", true,
                    "events", List.of("repo:push", "pullrequest:fulfilled"));
            HttpHeaders h = authHeaders(accessToken);
            h.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<String> res = rest.postForEntity(API + "/repositories/" + repoFullName + "/hooks", new HttpEntity<>(body, h), String.class);
            return om.readTree(res.getBody()).get("uuid").asText();
        } catch (Exception e) { throw new BadRequestException("Failed to setup Bitbucket webhook."); }
    }

    @Override
    public void deleteWebhook(String accessToken, String repoFullName, String hookId) {
        try {
            rest.exchange(API + "/repositories/" + repoFullName + "/hooks/" + hookId, HttpMethod.DELETE, new HttpEntity<>(authHeaders(accessToken)), Void.class);
        } catch (Exception e) { log.warn("Failed to delete Bitbucket webhook: {}", e.getMessage()); }
    }

    @Override
    public List<Map<String, Object>> fetchCommits(String accessToken, String repoFullName, String branch, int count) {
        try {
            JsonNode json = get(accessToken, API + "/repositories/" + repoFullName + "/commits/" + branch + "?pagelen=" + count);
            JsonNode commits = json.get("values");
            List<Map<String, Object>> result = new ArrayList<>();
            if (commits != null && commits.isArray()) {
                for (JsonNode c : commits) {
                    JsonNode author = c.get("author");
                    String authorName = author.has("user") ? author.get("user").get("display_name").asText() : author.get("raw").asText();
                    result.add(Map.of(
                            "sha", c.get("hash").asText(),
                            "message", c.get("message").asText(),
                            "authorName", authorName,
                            "authorEmail", "",
                            "date", c.get("date").asText()));
                }
            }
            return result;
        } catch (Exception e) { throw new BadRequestException("Failed to fetch Bitbucket commits."); }
    }

    @Override
    public List<Map<String, Object>> fetchTags(String accessToken, String repoFullName) {
        try {
            JsonNode json = get(accessToken, API + "/repositories/" + repoFullName + "/refs/tags?pagelen=30&sort=-target.date");
            JsonNode values = json.get("values");
            List<Map<String, Object>> result = new ArrayList<>();
            if (values != null && values.isArray()) {
                for (JsonNode t : values) {
                    Map<String, Object> tag = new LinkedHashMap<>();
                    tag.put("name", t.get("name").asText());
                    tag.put("sha", t.get("target").get("hash").asText());
                    result.add(tag);
                }
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
