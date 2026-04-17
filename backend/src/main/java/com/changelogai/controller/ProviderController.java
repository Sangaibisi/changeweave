package com.changelogai.controller;

import com.changelogai.dto.response.ApiResponse;
import com.changelogai.entity.User;
import com.changelogai.entity.enums.GitProvider;
import com.changelogai.exception.BadRequestException;
import com.changelogai.repository.UserRepository;
import com.changelogai.security.CustomUserDetails;
import com.changelogai.service.provider.GitProviderFactory;
import com.changelogai.service.provider.GitProviderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/providers")
public class ProviderController {

    private final GitProviderFactory providerFactory;
    private final UserRepository userRepository;

    public ProviderController(GitProviderFactory providerFactory, UserRepository userRepository) {
        this.providerFactory = providerFactory;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<String>>> listProviders() {
        return ResponseEntity.ok(ApiResponse.ok(providerFactory.getAvailableProviders()));
    }

    @GetMapping("/{provider}/auth")
    public ResponseEntity<ApiResponse<Map<String, String>>> getAuthUrl(
            @PathVariable String provider,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        GitProviderService svc = providerFactory.getProvider(provider);
        String url = svc.getAuthorizationUrl(userDetails.getId().toString());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("url", url, "provider", svc.getProviderName())));
    }

    @GetMapping("/{provider}/callback")
    public ResponseEntity<ApiResponse<Map<String, String>>> handleCallback(
            @PathVariable String provider,
            @RequestParam String code,
            @RequestParam String state) {
        GitProviderService svc = providerFactory.getProvider(provider);
        String accessToken = svc.exchangeCodeForToken(code);
        Map<String, Object> profile = svc.fetchUser(accessToken);

        java.util.UUID userId = java.util.UUID.fromString(state);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        String providerName = svc.getProviderName().toUpperCase();
        switch (providerName) {
            case "GITHUB" -> {
                user.setGithubId((String) profile.get("id"));
                user.setGithubAccessToken(accessToken);
            }
            case "GITLAB" -> {
                user.setGitlabId((String) profile.get("id"));
                user.setGitlabAccessToken(accessToken);
            }
            case "BITBUCKET", "BITBUCKET_DC" -> {
                user.setBitbucketId((String) profile.get("id"));
                user.setBitbucketAccessToken(accessToken);
            }
        }
        if (profile.get("avatarUrl") != null) user.setAvatarUrl((String) profile.get("avatarUrl"));
        if (profile.get("name") != null && (user.getName() == null || user.getName().isBlank())) {
            user.setName((String) profile.get("name"));
        }
        userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "connected", "provider", svc.getProviderName())));
    }

    @GetMapping("/{provider}/repos")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listRepos(
            @PathVariable String provider,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new BadRequestException("User not found"));
        String token = getProviderToken(user, provider);
        if (token == null) {
            throw new BadRequestException("Git provider not connected. Connect your " + provider + " account first.");
        }
        GitProviderService svc = providerFactory.getProvider(provider);
        List<Map<String, Object>> repos = svc.listRepos(token);
        return ResponseEntity.ok(ApiResponse.ok(repos));
    }

    @DeleteMapping("/{provider}")
    public ResponseEntity<ApiResponse<Void>> disconnect(
            @PathVariable String provider,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new BadRequestException("User not found"));
        switch (provider.toUpperCase()) {
            case "GITHUB" -> { user.setGithubId(null); user.setGithubAccessToken(null); }
            case "GITLAB" -> { user.setGitlabId(null); user.setGitlabAccessToken(null); }
            case "BITBUCKET", "BITBUCKET_DC" -> { user.setBitbucketId(null); user.setBitbucketAccessToken(null); }
        }
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    static String getProviderToken(User user, String provider) {
        return switch (provider.toUpperCase()) {
            case "GITHUB" -> user.getGithubAccessToken();
            case "GITLAB" -> user.getGitlabAccessToken();
            case "BITBUCKET", "BITBUCKET_DC" -> user.getBitbucketAccessToken();
            default -> null;
        };
    }
}
