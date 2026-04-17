package com.changelogai.controller;

import com.changelogai.dto.request.UpdateChangelogRequest;
import com.changelogai.dto.response.ApiResponse;
import com.changelogai.dto.response.ChangelogResponse;
import com.changelogai.security.CustomUserDetails;
import com.changelogai.service.ChangelogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/changelogs")
public class ChangelogDirectController {

    private final ChangelogService changelogService;

    public ChangelogDirectController(ChangelogService changelogService) {
        this.changelogService = changelogService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ChangelogResponse>> getChangelog(@PathVariable UUID id) {
        ChangelogResponse changelog = changelogService.getChangelog(id);
        return ResponseEntity.ok(ApiResponse.ok(changelog));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<ChangelogResponse>> updateChangelog(
            @PathVariable UUID id,
            @RequestBody UpdateChangelogRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ChangelogResponse changelog = changelogService.updateChangelog(id, userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok(changelog));
    }
}
