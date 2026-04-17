package com.changelogai.service;

import com.changelogai.entity.Changelog;
import com.changelogai.entity.ChangelogView;
import com.changelogai.entity.Repository;
import com.changelogai.exception.ResourceNotFoundException;
import com.changelogai.repository.ChangelogRepository;
import com.changelogai.repository.ChangelogViewRepository;
import com.changelogai.repository.RepoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    private final ChangelogViewRepository viewRepository;
    private final ChangelogRepository changelogRepository;
    private final RepoRepository repoRepository;

    public AnalyticsService(ChangelogViewRepository viewRepository,
                            ChangelogRepository changelogRepository,
                            RepoRepository repoRepository) {
        this.viewRepository = viewRepository;
        this.changelogRepository = changelogRepository;
        this.repoRepository = repoRepository;
    }

    @Transactional
    public void trackView(UUID changelogId, String userAgent, String ipAddress, String referrer) {
        Changelog changelog = changelogRepository.findById(changelogId).orElse(null);
        if (changelog == null) return;

        ChangelogView view = ChangelogView.builder()
                .changelog(changelog)
                .userAgent(userAgent)
                .ipAddress(ipAddress)
                .referrer(referrer)
                .build();
        viewRepository.save(view);
        changelogRepository.incrementViewCount(changelogId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRepoAnalytics(UUID repoId, UUID userId, int days) {
        Repository repo = repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));

        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);

        long totalViews = viewRepository.countByRepositoryId(repoId);
        long periodViews = viewRepository.countByRepositoryIdSince(repoId, since);

        List<Object[]> dailyRaw = viewRepository.dailyViewsByRepoId(repoId, since);
        List<Map<String, Object>> dailyViews = dailyRaw.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", row[0].toString());
            m.put("views", ((Number) row[1]).longValue());
            return m;
        }).collect(Collectors.toList());

        List<Object[]> topRaw = viewRepository.topChangelogsByRepoId(repoId, since);
        List<Map<String, Object>> topChangelogs = topRaw.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("version", row[0]);
            m.put("title", row[1]);
            m.put("views", ((Number) row[2]).longValue());
            return m;
        }).collect(Collectors.toList());

        List<Object[]> refRaw = viewRepository.topReferrersByRepoId(repoId, since);
        List<Map<String, Object>> topReferrers = refRaw.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("referrer", row[0]);
            m.put("views", ((Number) row[1]).longValue());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalViews", totalViews);
        result.put("periodViews", periodViews);
        result.put("days", days);
        result.put("dailyViews", dailyViews);
        result.put("topChangelogs", topChangelogs);
        result.put("topReferrers", topReferrers);
        return result;
    }
}
