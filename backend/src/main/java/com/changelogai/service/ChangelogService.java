package com.changelogai.service;

import com.changelogai.dto.request.CreateChangelogRequest;
import com.changelogai.dto.request.UpdateChangelogRequest;
import com.changelogai.dto.response.ChangelogResponse;
import com.changelogai.entity.Changelog;
import com.changelogai.entity.Commit;
import com.changelogai.entity.Repository;
import com.changelogai.entity.enums.RepoVisibility;
import com.changelogai.exception.BadRequestException;
import com.changelogai.exception.ResourceNotFoundException;
import com.changelogai.repository.ChangelogRepository;
import com.changelogai.repository.CommitRepository;
import com.changelogai.repository.RepoRepository;
import com.changelogai.repository.UserRepository;
import com.changelogai.entity.User;
import com.changelogai.service.mapper.EntityMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ChangelogService {

    private static final Logger log = LoggerFactory.getLogger(ChangelogService.class);

    private final ChangelogRepository changelogRepository;
    private final RepoRepository repoRepository;
    private final CommitRepository commitRepository;
    private final UserRepository userRepository;
    private final AITransformationService aiTransformationService;
    private final McpAnalysisService mcpAnalysisService;
    private final EntityMapper entityMapper;

    public ChangelogService(ChangelogRepository changelogRepository,
                            RepoRepository repoRepository,
                            CommitRepository commitRepository,
                            UserRepository userRepository,
                            AITransformationService aiTransformationService,
                            McpAnalysisService mcpAnalysisService,
                            EntityMapper entityMapper) {
        this.changelogRepository = changelogRepository;
        this.repoRepository = repoRepository;
        this.commitRepository = commitRepository;
        this.userRepository = userRepository;
        this.aiTransformationService = aiTransformationService;
        this.mcpAnalysisService = mcpAnalysisService;
        this.entityMapper = entityMapper;
    }

    @Transactional(readOnly = true)
    public Page<ChangelogResponse> getChangelogsByRepo(UUID repoId, UUID userId, Pageable pageable) {
        Repository repo = getRepoForUser(repoId, userId);
        return changelogRepository.findByRepositoryIdOrderByCreatedAtDesc(repo.getId(), pageable)
                .map(entityMapper::toChangelogResponse);
    }

    @Transactional(readOnly = true)
    public ChangelogResponse getChangelog(UUID changelogId) {
        Changelog changelog = changelogRepository.findById(changelogId)
                .orElseThrow(() -> new ResourceNotFoundException("Changelog not found"));
        return entityMapper.toChangelogResponse(changelog);
    }

    @Transactional
    public ChangelogResponse createChangelog(UUID repoId, UUID userId, CreateChangelogRequest request) {
        Repository repo = getRepoForUser(repoId, userId);

        changelogRepository.findByRepositoryIdAndVersion(repo.getId(), request.getVersion())
                .ifPresent(c -> {
                    throw new BadRequestException("Version " + request.getVersion() + " already exists");
                });

        String slug = repo.getSlug() + "-" + request.getVersion()
                .replaceAll("[^a-zA-Z0-9.-]", "-").toLowerCase();

        Changelog changelog = Changelog.builder()
                .repository(repo)
                .version(request.getVersion())
                .title(request.getTitle() != null ? request.getTitle() : "Release " + request.getVersion())
                .slug(slug)
                .build();

        changelog = changelogRepository.save(changelog);
        return entityMapper.toChangelogResponse(changelog);
    }

    @Transactional
    public ChangelogResponse updateChangelog(UUID changelogId, UUID userId, UpdateChangelogRequest request) {
        Changelog changelog = changelogRepository.findById(changelogId)
                .orElseThrow(() -> new ResourceNotFoundException("Changelog not found"));

        verifyOwnership(changelog, userId);

        if (request.getTitle() != null) changelog.setTitle(request.getTitle());
        if (request.getSummary() != null) changelog.setSummary(request.getSummary());
        if (request.getContent() != null) changelog.setContent(request.getContent());
        if (request.getVersion() != null) changelog.setVersion(request.getVersion());

        changelog = changelogRepository.save(changelog);
        return entityMapper.toChangelogResponse(changelog);
    }

    @Transactional
    public ChangelogResponse publishChangelog(UUID changelogId, UUID userId) {
        Changelog changelog = changelogRepository.findById(changelogId)
                .orElseThrow(() -> new ResourceNotFoundException("Changelog not found"));

        verifyOwnership(changelog, userId);

        changelog.setIsDraft(false);
        changelog.setPublishedAt(Instant.now());
        changelog = changelogRepository.save(changelog);
        return entityMapper.toChangelogResponse(changelog);
    }

    @Transactional
    public void deleteChangelog(UUID changelogId, UUID userId) {
        Changelog changelog = changelogRepository.findById(changelogId)
                .orElseThrow(() -> new ResourceNotFoundException("Changelog not found"));
        verifyOwnership(changelog, userId);
        changelogRepository.delete(changelog);
    }

    @Transactional(readOnly = true)
    public Page<ChangelogResponse> getPublicChangelogs(String slug, String token, Pageable pageable) {
        Repository repo = repoRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (!repo.getIsActive()) {
            throw new ResourceNotFoundException("Project not found");
        }

        if (repo.getVisibility() == RepoVisibility.PRIVATE) {
            throw new ResourceNotFoundException("Project not found");
        }

        if (repo.getVisibility() == RepoVisibility.TOKEN_PROTECTED) {
            if (token == null || !token.equals(repo.getAccessToken())) {
                throw new BadRequestException("Invalid or missing access token");
            }
        }

        return changelogRepository
                .findByRepositoryIdAndIsDraftFalseOrderByPublishedAtDesc(repo.getId(), pageable)
                .map(entityMapper::toChangelogResponse);
    }

    @Transactional
    public ChangelogResponse generateChangelog(UUID repoId, UUID userId, CreateChangelogRequest request) {
        Repository repo = getRepoForUser(repoId, userId);

        changelogRepository.findByRepositoryIdAndVersion(repo.getId(), request.getVersion())
                .ifPresent(c -> { throw new BadRequestException("Version " + request.getVersion() + " already exists"); });

        List<Commit> unprocessed = commitRepository.findByRepositoryIdAndIsProcessedFalseOrderByCommittedAtAsc(repo.getId());
        if (unprocessed.isEmpty()) {
            throw new BadRequestException("No pending commits to generate changelog from.");
        }

        log.info("Generating changelog for {} with {} commits", repo.getFullName(), unprocessed.size());

        // Try MCP-powered LOC-level analysis first, fall back to commit-message-based
        Map<String, Object> settings = repo.getSettings() != null ? repo.getSettings() : Map.of();
        // Fetch user's GitHub OAuth token for MCP per-request authentication
        String githubToken = userRepository.findById(userId)
                .map(User::getGithubAccessToken)
                .orElse(null);
        String content = generateWithMcp(repo, request.getVersion(), unprocessed, settings, githubToken);
        if (content == null) {
            log.info("MCP unavailable, falling back to commit-message-based generation");
            content = aiTransformationService.transformCommits(unprocessed, settings);
        }

        String slug = repo.getSlug() + "-" + request.getVersion()
                .replaceAll("[^a-zA-Z0-9.-]", "-").toLowerCase();

        Changelog changelog = Changelog.builder()
                .repository(repo)
                .version(request.getVersion())
                .title(request.getTitle() != null ? request.getTitle() : "Release " + request.getVersion())
                .content(content)
                .slug(slug)
                .build();
        changelog = changelogRepository.save(changelog);

        for (Commit commit : unprocessed) {
            commit.setChangelog(changelog);
            commit.setIsProcessed(true);
        }
        commitRepository.saveAll(unprocessed);

        log.info("Changelog {} generated for {} ({} commits processed)", request.getVersion(), repo.getFullName(), unprocessed.size());
        return entityMapper.toChangelogResponse(changelog);
    }

    /**
     * Attempt LOC-level changelog generation via MCP Server.
     * Returns null if MCP is unavailable, letting the caller fall back.
     */
    private String generateWithMcp(Repository repo, String version, List<Commit> commits, Map<String, Object> settings, String githubToken) {
        if (!mcpAnalysisService.isAvailable()) {
            return null;
        }

        try {
            // Parse owner/repo from fullName (e.g., "acme/my-app")
            String fullName = repo.getFullName();
            String[] parts = fullName.split("/");
            if (parts.length != 2) return null;

            String owner = parts[0];
            String repoName = parts[1];

            // Determine base ref: earliest unprocessed commit's parent or default branch
            String baseRef = repo.getDefaultBranch();
            if (!commits.isEmpty()) {
                // Use the SHA before the oldest unprocessed commit
                baseRef = commits.get(0).getSha() + "~1";
            }

            String mcpResult = mcpAnalysisService.generateChangelog(
                    owner, repoName, version,
                    baseRef, "HEAD",
                    "user-friendly", "end-users", "en",
                    githubToken
            );

            if (mcpResult != null && !mcpResult.isBlank()) {
                // MCP returns rich context — send it to LLM for final polishing
                String polished = aiTransformationService.transformWithContext(mcpResult, settings);
                if (polished != null) {
                    log.info("Changelog generated via MCP LOC-level analysis");
                    return polished;
                }
                // If LLM fails, MCP output itself is still useful
                return mcpResult;
            }
        } catch (Exception e) {
            log.warn("MCP changelog generation failed: {}", e.getMessage());
        }
        return null;
    }

    @Transactional
    public ChangelogResponse regenerateChangelog(UUID changelogId, UUID userId) {
        Changelog changelog = changelogRepository.findById(changelogId)
                .orElseThrow(() -> new ResourceNotFoundException("Changelog not found"));
        verifyOwnership(changelog, userId);

        List<Commit> commits = commitRepository.findByChangelogId(changelogId);
        if (commits.isEmpty()) {
            throw new BadRequestException("No commits associated with this changelog.");
        }

        String content = aiTransformationService.transformCommits(commits);
        changelog.setContent(content);
        changelog = changelogRepository.save(changelog);

        log.info("Changelog {} regenerated ({} commits)", changelog.getVersion(), commits.size());
        return entityMapper.toChangelogResponse(changelog);
    }

    private Repository getRepoForUser(UUID repoId, UUID userId) {
        return repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));
    }

    private void verifyOwnership(Changelog changelog, UUID userId) {
        if (!changelog.getRepository().getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Changelog not found");
        }
    }
}
