package com.changelogai.controller;

import com.changelogai.dto.request.ConnectRepoRequest;
import com.changelogai.dto.request.UpdateRepoSettingsRequest;
import com.changelogai.dto.request.UpdateRepoVisibilityRequest;
import com.changelogai.dto.response.ApiResponse;
import com.changelogai.dto.response.RepoResponse;
import com.changelogai.security.CustomUserDetails;
import com.changelogai.service.RepoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/repos")
public class RepoController {

    private final RepoService repoService;

    public RepoController(RepoService repoService) {
        this.repoService = repoService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RepoResponse>>> listRepos(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<RepoResponse> repos = repoService.getUserRepos(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(repos));
    }

    @GetMapping("/github")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listGitHubRepos(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<Map<String, Object>> repos = repoService.listGitHubRepos(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(repos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RepoResponse>> getRepo(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        RepoResponse repo = repoService.getRepo(id, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(repo));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RepoResponse>> connectRepo(
            @Valid @RequestBody ConnectRepoRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        RepoResponse repo = repoService.connectRepo(userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(repo));
    }

    @PostMapping("/{id}/repair-webhook")
    public ResponseEntity<ApiResponse<RepoResponse>> repairWebhook(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        RepoResponse repo = repoService.repairWebhook(id, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(repo));
    }

    @PostMapping("/{id}/sync")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> syncCommits(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        int count = repoService.syncCommits(id, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("synced", count)));
    }

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<ApiResponse<RepoResponse>> updateVisibility(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRepoVisibilityRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        RepoResponse repo = repoService.updateVisibility(id, userDetails.getId(), request.getVisibility());
        return ResponseEntity.ok(ApiResponse.ok(repo));
    }

    @PostMapping("/{id}/regenerate-token")
    public ResponseEntity<ApiResponse<RepoResponse>> regenerateAccessToken(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        RepoResponse repo = repoService.regenerateAccessToken(id, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(repo));
    }

    @GetMapping("/{id}/tags")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTags(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<Map<String, Object>> tags = repoService.fetchTags(id, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(tags));
    }

    @PatchMapping("/{id}/settings")
    public ResponseEntity<ApiResponse<RepoResponse>> updateSettings(
            @PathVariable UUID id,
            @RequestBody UpdateRepoSettingsRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        RepoResponse repo = repoService.updateSettings(id, userDetails.getId(), request.getSettings());
        return ResponseEntity.ok(ApiResponse.ok(repo));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> disconnectRepo(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        repoService.disconnectRepo(id, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
