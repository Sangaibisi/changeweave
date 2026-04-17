package com.changelogai.service;

import com.changelogai.dto.request.ConnectRepoRequest;
import com.changelogai.dto.response.RepoResponse;
import com.changelogai.entity.Commit;
import com.changelogai.entity.Repository;
import com.changelogai.entity.User;
import com.changelogai.entity.enums.CommitCategory;
import com.changelogai.entity.enums.GitProvider;
import com.changelogai.entity.enums.ImpactScore;
import com.changelogai.entity.enums.RepoVisibility;
import com.changelogai.exception.BadRequestException;
import com.changelogai.exception.ConflictException;
import com.changelogai.exception.ResourceNotFoundException;
import com.changelogai.service.provider.GitProviderFactory;
import com.changelogai.service.provider.GitProviderService;
import com.changelogai.repository.ChangelogRepository;
import com.changelogai.repository.CommitRepository;
import com.changelogai.repository.RepoRepository;
import com.changelogai.repository.UserRepository;
import com.changelogai.service.mapper.EntityMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RepoService {

    private static final Logger log = LoggerFactory.getLogger(RepoService.class);

    private final RepoRepository repoRepository;
    private final UserRepository userRepository;
    private final ChangelogRepository changelogRepository;
    private final CommitRepository commitRepository;
    private final EntityMapper entityMapper;
    private final GitHubApiService gitHubApiService;
    private final CommitParserService commitParserService;
    private final GitProviderFactory gitProviderFactory;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public RepoService(RepoRepository repoRepository,
                       UserRepository userRepository,
                       ChangelogRepository changelogRepository,
                       CommitRepository commitRepository,
                       EntityMapper entityMapper,
                       GitHubApiService gitHubApiService,
                       CommitParserService commitParserService,
                       GitProviderFactory gitProviderFactory) {
        this.repoRepository = repoRepository;
        this.userRepository = userRepository;
        this.changelogRepository = changelogRepository;
        this.commitRepository = commitRepository;
        this.entityMapper = entityMapper;
        this.gitHubApiService = gitHubApiService;
        this.commitParserService = commitParserService;
        this.gitProviderFactory = gitProviderFactory;
    }

    @Transactional(readOnly = true)
    public List<RepoResponse> getUserRepos(UUID userId) {
        return repoRepository.findByUserIdAndIsActiveTrue(userId).stream()
                .map(repo -> {
                    long changelogCount = changelogRepository.countByRepositoryId(repo.getId());
                    long unprocessedCount = commitRepository.countByRepositoryIdAndIsProcessedFalse(repo.getId());
                    return entityMapper.toRepoResponse(repo, changelogCount, unprocessedCount);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RepoResponse getRepo(UUID repoId, UUID userId) {
        Repository repo = repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));
        long changelogCount = changelogRepository.countByRepositoryId(repo.getId());
        long unprocessedCount = commitRepository.countByRepositoryIdAndIsProcessedFalse(repo.getId());
        return entityMapper.toRepoResponse(repo, changelogCount, unprocessedCount);
    }

    public List<Map<String, Object>> listGitHubRepos(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getGithubAccessToken() == null) {
            throw new BadRequestException("GitHub account not connected.");
        }
        return gitHubApiService.listUserRepos(user.getGithubAccessToken());
    }

    @Transactional
    public RepoResponse connectRepo(UUID userId, ConnectRepoRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getGithubAccessToken() == null) {
            throw new BadRequestException("GitHub account not connected. Please connect your GitHub account first.");
        }

        String fullName = request.getFullName();

        if (repoRepository.existsByProviderAndProviderRepoId(GitProvider.GITHUB, fullName)) {
            throw new ConflictException("Repository already connected");
        }

        String slug = request.getSlug() != null
                ? request.getSlug().toLowerCase().replaceAll("[^a-z0-9-]", "-")
                : fullName.replace("/", "-").toLowerCase();

        String name = fullName.contains("/") ? fullName.split("/")[1] : fullName;

        String webhookSecret = UUID.randomUUID().toString();
        String webhookId = null;
        try {
            webhookId = gitHubApiService.createWebhook(user.getGithubAccessToken(), fullName, webhookSecret);
        } catch (Exception e) {
            log.warn("Webhook setup failed for {}: {}", fullName, e.getMessage());
        }

        Repository repo = Repository.builder()
                .user(user)
                .name(name)
                .fullName(fullName)
                .provider(GitProvider.GITHUB)
                .providerRepoId(fullName)
                .providerRepoUrl("https://github.com/" + fullName)
                .slug(slug)
                .webhookId(webhookId)
                .webhookSecret(webhookSecret)
                .accessToken(generateAccessToken())
                .build();

        repo = repoRepository.save(repo);
        log.info("Repository connected: {} (webhook={})", fullName, webhookId != null ? webhookId : "failed");

        fetchInitialCommits(user.getGithubAccessToken(), repo);

        long changelogCount = changelogRepository.countByRepositoryId(repo.getId());
        long unprocessedCount = commitRepository.countByRepositoryIdAndIsProcessedFalse(repo.getId());
        return entityMapper.toRepoResponse(repo, changelogCount, unprocessedCount);
    }

    @Transactional
    public void disconnectRepo(UUID repoId, UUID userId) {
        Repository repo = repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));

        User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getGithubAccessToken() != null && repo.getWebhookId() != null) {
            gitHubApiService.deleteWebhook(user.getGithubAccessToken(), repo.getFullName(), repo.getWebhookId());
        }

        repo.setIsActive(false);
        repoRepository.save(repo);
        log.info("Repository disconnected: {}", repo.getFullName());
    }

    @Transactional
    public RepoResponse repairWebhook(UUID repoId, UUID userId) {
        Repository repo = repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getGithubAccessToken() == null) {
            throw new BadRequestException("GitHub account not connected.");
        }

        // Delete old webhook if exists
        if (repo.getWebhookId() != null) {
            gitHubApiService.deleteWebhook(user.getGithubAccessToken(), repo.getFullName(), repo.getWebhookId());
        }

        String secret = UUID.randomUUID().toString();
        String webhookId = gitHubApiService.createWebhook(user.getGithubAccessToken(), repo.getFullName(), secret);
        repo.setWebhookId(webhookId);
        repo.setWebhookSecret(secret);
        repo = repoRepository.save(repo);

        log.info("Webhook repaired for {} (id={})", repo.getFullName(), webhookId);
        long changelogCount = changelogRepository.countByRepositoryId(repo.getId());
        long unprocessedCount = commitRepository.countByRepositoryIdAndIsProcessedFalse(repo.getId());
        return entityMapper.toRepoResponse(repo, changelogCount, unprocessedCount);
    }

    @Transactional
    public int syncCommits(UUID repoId, UUID userId) {
        Repository repo = repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getGithubAccessToken() == null) {
            throw new BadRequestException("GitHub account not connected.");
        }
        return fetchInitialCommits(user.getGithubAccessToken(), repo);
    }

    @Transactional
    public RepoResponse updateVisibility(UUID repoId, UUID userId, RepoVisibility visibility) {
        Repository repo = repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));
        repo.setVisibility(visibility);
        if (visibility == RepoVisibility.TOKEN_PROTECTED && (repo.getAccessToken() == null || repo.getAccessToken().isBlank())) {
            repo.setAccessToken(generateAccessToken());
        }
        repo = repoRepository.save(repo);
        long changelogCount = changelogRepository.countByRepositoryId(repo.getId());
        long unprocessedCount = commitRepository.countByRepositoryIdAndIsProcessedFalse(repo.getId());
        return entityMapper.toRepoResponse(repo, changelogCount, unprocessedCount);
    }

    @Transactional
    public RepoResponse regenerateAccessToken(UUID repoId, UUID userId) {
        Repository repo = repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));
        repo.setAccessToken(generateAccessToken());
        repo = repoRepository.save(repo);
        long changelogCount = changelogRepository.countByRepositoryId(repo.getId());
        long unprocessedCount = commitRepository.countByRepositoryIdAndIsProcessedFalse(repo.getId());
        return entityMapper.toRepoResponse(repo, changelogCount, unprocessedCount);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> fetchTags(UUID repoId, UUID userId) {
        Repository repo = repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String token = getProviderToken(user, repo.getProvider());
        if (token == null) {
            throw new BadRequestException("Git provider not connected.");
        }
        try {
            GitProviderService providerService = gitProviderFactory.getProvider(repo.getProvider());
            return providerService.fetchTags(token, repo.getFullName());
        } catch (Exception e) {
            log.warn("Failed to fetch tags for {}: {}", repo.getFullName(), e.getMessage());
            return List.of();
        }
    }

    private String getProviderToken(User user, com.changelogai.entity.enums.GitProvider provider) {
        return switch (provider) {
            case GITHUB -> user.getGithubAccessToken();
            case GITLAB -> user.getGitlabAccessToken();
            case BITBUCKET -> user.getBitbucketAccessToken();
        };
    }

    @Transactional
    public RepoResponse updateSettings(UUID repoId, UUID userId, Map<String, Object> settings) {
        Repository repo = repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));
        Map<String, Object> current = repo.getSettings() != null ? new java.util.HashMap<>(repo.getSettings()) : new java.util.HashMap<>();
        current.putAll(settings);
        repo.setSettings(current);
        repo = repoRepository.save(repo);
        long changelogCount = changelogRepository.countByRepositoryId(repo.getId());
        long unprocessedCount = commitRepository.countByRepositoryIdAndIsProcessedFalse(repo.getId());
        return entityMapper.toRepoResponse(repo, changelogCount, unprocessedCount);
    }

    private String generateAccessToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return "cwt_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private int fetchInitialCommits(String accessToken, Repository repo) {
        try {
            List<Map<String, Object>> commits = gitHubApiService.fetchRecentCommits(
                    accessToken, repo.getFullName(), repo.getDefaultBranch(), 30);

            int saved = 0;
            for (Map<String, Object> c : commits) {
                String sha = (String) c.get("sha");
                if (commitRepository.existsByRepositoryIdAndSha(repo.getId(), sha)) continue;

                String message = (String) c.get("message");
                CommitCategory category = commitParserService.detectCategory(message);
                ImpactScore impact = commitParserService.detectImpactScore(message, category);

                Commit commit = Commit.builder()
                        .repository(repo)
                        .sha(sha)
                        .message(message)
                        .authorName((String) c.get("authorName"))
                        .authorEmail((String) c.get("authorEmail"))
                        .committedAt(Instant.parse((String) c.get("date")))
                        .category(category)
                        .impactScore(impact)
                        .build();

                commitRepository.save(commit);
                saved++;
            }
            log.info("Fetched {} commits for {}", saved, repo.getFullName());
            return saved;
        } catch (Exception e) {
            log.warn("Commit fetch failed for {}: {}", repo.getFullName(), e.getMessage());
            return 0;
        }
    }
}
