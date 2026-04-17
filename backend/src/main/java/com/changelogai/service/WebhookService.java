package com.changelogai.service;

import com.changelogai.entity.Commit;
import com.changelogai.entity.Repository;
import com.changelogai.entity.enums.CommitCategory;
import com.changelogai.entity.enums.GitProvider;
import com.changelogai.entity.enums.ImpactScore;
import com.changelogai.repository.CommitRepository;
import com.changelogai.repository.RepoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class WebhookService {

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);

    private final RepoRepository repoRepository;
    private final CommitRepository commitRepository;
    private final CommitParserService commitParserService;

    public WebhookService(RepoRepository repoRepository,
                          CommitRepository commitRepository,
                          CommitParserService commitParserService) {
        this.repoRepository = repoRepository;
        this.commitRepository = commitRepository;
        this.commitParserService = commitParserService;
    }

    @Async
    @Transactional
    @SuppressWarnings("unchecked")
    public void handlePushEvent(Map<String, Object> payload) {
        try {
            Map<String, Object> repoData = (Map<String, Object>) payload.get("repository");
            if (repoData == null) {
                log.warn("Push event missing repository data");
                return;
            }

            String repoId = String.valueOf(repoData.get("id"));
            Optional<Repository> repoOpt = repoRepository.findByProviderAndProviderRepoId(
                    GitProvider.GITHUB, (String) repoData.get("full_name"));

            if (repoOpt.isEmpty()) {
                repoOpt = repoRepository.findByProviderAndProviderRepoId(GitProvider.GITHUB, repoId);
            }

            if (repoOpt.isEmpty()) {
                log.debug("Ignoring push event for untracked repo: {}", repoData.get("full_name"));
                return;
            }

            Repository repo = repoOpt.get();
            List<Map<String, Object>> commits = (List<Map<String, Object>>) payload.get("commits");

            if (commits == null || commits.isEmpty()) {
                log.debug("Push event has no commits");
                return;
            }

            int saved = 0;
            for (Map<String, Object> commitData : commits) {
                String sha = (String) commitData.get("id");
                String message = (String) commitData.get("message");

                if (commitRepository.existsByRepositoryIdAndSha(repo.getId(), sha)) {
                    continue;
                }

                Map<String, Object> author = (Map<String, Object>) commitData.get("author");
                String authorName = author != null ? (String) author.get("name") : "Unknown";
                String authorEmail = author != null ? (String) author.get("email") : "";

                CommitCategory category = commitParserService.detectCategory(message);
                ImpactScore impact = commitParserService.detectImpactScore(message, category);

                Commit commit = Commit.builder()
                        .repository(repo)
                        .sha(sha)
                        .message(message)
                        .authorName(authorName)
                        .authorEmail(authorEmail)
                        .committedAt(Instant.now())
                        .category(category)
                        .impactScore(impact)
                        .build();

                commitRepository.save(commit);
                saved++;
            }

            log.info("Processed push event for {}: {} new commits saved", repo.getFullName(), saved);

        } catch (Exception e) {
            log.error("Failed to process push event", e);
        }
    }

    @Async
    @Transactional
    @SuppressWarnings("unchecked")
    public void handleTagEvent(Map<String, Object> payload) {
        String refType = (String) payload.get("ref_type");
        if (!"tag".equals(refType)) return;

        String tagName = (String) payload.get("ref");
        log.info("Tag created: {}", tagName);
    }
}
