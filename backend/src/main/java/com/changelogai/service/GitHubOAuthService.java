package com.changelogai.service;

import com.changelogai.entity.User;
import com.changelogai.exception.BadRequestException;
import com.changelogai.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class GitHubOAuthService {

    private static final Logger log = LoggerFactory.getLogger(GitHubOAuthService.class);

    @Value("${app.github.client-id:}")
    private String clientId;

    @Value("${app.github.client-secret:}")
    private String clientSecret;

    @Value("${app.public-url:http://localhost:3000}")
    private String publicUrl;

    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GitHubOAuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public String getAuthorizationUrl(UUID userId) {
        if (clientId == null || clientId.isBlank()) {
            throw new BadRequestException("GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.");
        }
        return "https://github.com/login/oauth/authorize"
                + "?client_id=" + clientId
                + "&redirect_uri=" + publicUrl + "/auth/github/callback"
                + "&scope=repo,read:user,user:email,read:org"
                + "&state=" + userId.toString();
    }

    @Transactional
    public void handleCallback(String code, String state) {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw new BadRequestException("GitHub OAuth is not configured.");
        }

        UUID userId;
        try {
            userId = UUID.fromString(state);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid OAuth state");
        }

        String accessToken = exchangeCodeForToken(code);
        JsonNode githubUser = fetchGitHubUser(accessToken);

        String githubId = githubUser.get("id").asText();
        String avatarUrl = githubUser.has("avatar_url") ? githubUser.get("avatar_url").asText() : null;
        String name = githubUser.has("name") && !githubUser.get("name").isNull()
                ? githubUser.get("name").asText() : null;

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        user.setGithubId(githubId);
        user.setGithubAccessToken(accessToken);
        if (avatarUrl != null) user.setAvatarUrl(avatarUrl);
        if (name != null && (user.getName() == null || user.getName().isBlank())) user.setName(name);

        userRepository.save(user);
        log.info("GitHub connected for user {} (github_id={})", userId, githubId);
    }

    @Transactional
    public void disconnect(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));
        user.setGithubId(null);
        user.setGithubAccessToken(null);
        userRepository.save(user);
        log.info("GitHub disconnected for user {}", userId);
    }

    private String exchangeCodeForToken(String code) {
        try {
            Map<String, String> body = new HashMap<>();
            body.put("client_id", clientId);
            body.put("client_secret", clientSecret);
            body.put("code", code);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Accept", "application/json");

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                    "https://github.com/login/oauth/access_token", request, String.class);

            JsonNode json = objectMapper.readTree(response.getBody());

            if (json.has("error")) {
                throw new BadRequestException("GitHub OAuth error: " + json.get("error_description").asText());
            }

            return json.get("access_token").asText();
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to exchange GitHub code for token", e);
            throw new BadRequestException("Failed to connect GitHub. Please try again.");
        }
    }

    private JsonNode fetchGitHubUser(String accessToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + accessToken);
            headers.set("Accept", "application/json");

            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    "https://api.github.com/user", HttpMethod.GET, request, String.class);

            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            log.error("Failed to fetch GitHub user", e);
            throw new BadRequestException("Failed to fetch GitHub profile.");
        }
    }
}
