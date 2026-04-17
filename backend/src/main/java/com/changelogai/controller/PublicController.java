package com.changelogai.controller;

import com.changelogai.dto.response.ApiResponse;
import com.changelogai.dto.response.ChangelogResponse;
import com.changelogai.service.AnalyticsService;
import com.changelogai.service.ChangelogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/public")
public class PublicController {

    private final ChangelogService changelogService;
    private final AnalyticsService analyticsService;

    public PublicController(ChangelogService changelogService, AnalyticsService analyticsService) {
        this.changelogService = changelogService;
        this.analyticsService = analyticsService;
    }

    @GetMapping("/{slug}/changelogs")
    public ResponseEntity<ApiResponse<Page<ChangelogResponse>>> getPublicChangelogs(
            @PathVariable String slug,
            @RequestParam(required = false) String token,
            @PageableDefault(size = 20) Pageable pageable,
            HttpServletRequest request) {
        Page<ChangelogResponse> changelogs = changelogService.getPublicChangelogs(slug, token, pageable);
        // Track views for each returned changelog (async-safe, fire & forget)
        String ua = request.getHeader("User-Agent");
        String ip = request.getRemoteAddr();
        String ref = request.getHeader("Referer");
        changelogs.getContent().forEach(cl ->
                analyticsService.trackView(cl.getId(), ua, ip, ref));
        return ResponseEntity.ok(ApiResponse.ok(changelogs));
    }

    @GetMapping(value = "/{slug}/rss", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> getRssFeed(
            @PathVariable String slug,
            @RequestParam(required = false) String token) {
        Page<ChangelogResponse> changelogs = changelogService.getPublicChangelogs(
                slug, token, Pageable.ofSize(20));

        StringBuilder rss = new StringBuilder();
        rss.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        rss.append("<rss version=\"2.0\">\n<channel>\n");
        rss.append("  <title>").append(slug).append(" — Changelog</title>\n");
        rss.append("  <description>Release notes for ").append(slug).append("</description>\n");
        rss.append("  <link>https://changelogai.com/changelog/").append(slug).append("</link>\n");

        for (ChangelogResponse cl : changelogs.getContent()) {
            rss.append("  <item>\n");
            rss.append("    <title>").append(escapeXml(cl.getVersion())).append(" — ").append(escapeXml(cl.getTitle())).append("</title>\n");
            rss.append("    <description><![CDATA[").append(cl.getContent() != null ? cl.getContent() : "").append("]]></description>\n");
            if (cl.getPublishedAt() != null) {
                rss.append("    <pubDate>").append(cl.getPublishedAt()).append("</pubDate>\n");
            }
            rss.append("    <guid>").append(cl.getId()).append("</guid>\n");
            rss.append("  </item>\n");
        }

        rss.append("</channel>\n</rss>");
        return ResponseEntity.ok(rss.toString());
    }

    private String escapeXml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
