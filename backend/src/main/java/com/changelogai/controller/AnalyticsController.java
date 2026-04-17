package com.changelogai.controller;

import com.changelogai.dto.response.ApiResponse;
import com.changelogai.security.CustomUserDetails;
import com.changelogai.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/repos/{repoId}/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAnalytics(
            @PathVariable UUID repoId,
            @RequestParam(defaultValue = "30") int days,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Map<String, Object> analytics = analyticsService.getRepoAnalytics(repoId, userDetails.getId(), days);
        return ResponseEntity.ok(ApiResponse.ok(analytics));
    }
}
