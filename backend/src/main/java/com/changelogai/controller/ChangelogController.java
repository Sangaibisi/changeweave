package com.changelogai.controller;

import com.changelogai.dto.request.CreateChangelogRequest;
import com.changelogai.dto.request.UpdateChangelogRequest;
import com.changelogai.dto.response.ApiResponse;
import com.changelogai.dto.response.ChangelogResponse;
import com.changelogai.security.CustomUserDetails;
import com.changelogai.service.ChangelogService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/repos/{repoId}/changelogs")
public class ChangelogController {

    private final ChangelogService changelogService;

    public ChangelogController(ChangelogService changelogService) {
        this.changelogService = changelogService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ChangelogResponse>>> listChangelogs(
            @PathVariable UUID repoId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<ChangelogResponse> changelogs = changelogService.getChangelogsByRepo(
                repoId, userDetails.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.ok(changelogs));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ChangelogResponse>> createChangelog(
            @PathVariable UUID repoId,
            @Valid @RequestBody CreateChangelogRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ChangelogResponse changelog = changelogService.createChangelog(
                repoId, userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(changelog));
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<ChangelogResponse>> generateChangelog(
            @PathVariable UUID repoId,
            @Valid @RequestBody CreateChangelogRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ChangelogResponse changelog = changelogService.generateChangelog(
                repoId, userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(changelog));
    }

    @GetMapping("/{changelogId}")
    public ResponseEntity<ApiResponse<ChangelogResponse>> getChangelog(
            @PathVariable UUID repoId,
            @PathVariable UUID changelogId) {
        ChangelogResponse changelog = changelogService.getChangelog(changelogId);
        return ResponseEntity.ok(ApiResponse.ok(changelog));
    }

    @PatchMapping("/{changelogId}")
    public ResponseEntity<ApiResponse<ChangelogResponse>> updateChangelog(
            @PathVariable UUID repoId,
            @PathVariable UUID changelogId,
            @RequestBody UpdateChangelogRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ChangelogResponse changelog = changelogService.updateChangelog(
                changelogId, userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok(changelog));
    }

    @PostMapping("/{changelogId}/publish")
    public ResponseEntity<ApiResponse<ChangelogResponse>> publishChangelog(
            @PathVariable UUID repoId,
            @PathVariable UUID changelogId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ChangelogResponse changelog = changelogService.publishChangelog(
                changelogId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(changelog));
    }

    @DeleteMapping("/{changelogId}")
    public ResponseEntity<ApiResponse<Void>> deleteChangelog(
            @PathVariable UUID repoId,
            @PathVariable UUID changelogId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        changelogService.deleteChangelog(changelogId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
