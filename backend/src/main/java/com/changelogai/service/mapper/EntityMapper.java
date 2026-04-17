package com.changelogai.service.mapper;

import com.changelogai.dto.response.*;
import com.changelogai.entity.*;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.stream.Collectors;

@Component
public class EntityMapper {

    public UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .avatarUrl(user.getAvatarUrl())
                .planType(user.getPlanType())
                .emailVerified(user.getEmailVerified())
                .githubConnected(user.getGithubId() != null)
                .gitlabConnected(user.getGitlabId() != null)
                .bitbucketConnected(user.getBitbucketId() != null)
                .createdAt(user.getCreatedAt())
                .build();
    }

    public RepoResponse toRepoResponse(Repository repo, long changelogCount, long unprocessedCommitCount) {
        return RepoResponse.builder()
                .id(repo.getId())
                .name(repo.getName())
                .fullName(repo.getFullName())
                .provider(repo.getProvider())
                .providerRepoUrl(repo.getProviderRepoUrl())
                .defaultBranch(repo.getDefaultBranch())
                .description(repo.getDescription())
                .slug(repo.getSlug())
                .visibility(repo.getVisibility())
                .accessToken(repo.getAccessToken())
                .isActive(repo.getIsActive())
                .changelogCount(changelogCount)
                .unprocessedCommitCount(unprocessedCommitCount)
                .settings(repo.getSettings())
                .createdAt(repo.getCreatedAt())
                .build();
    }

    public ChangelogResponse toChangelogResponse(Changelog changelog) {
        var categories = changelog.getCategories() != null
                ? changelog.getCategories().stream()
                    .map(cat -> ChangelogResponse.CategoryResponse.builder()
                            .category(cat.getCategory())
                            .title(cat.getTitle())
                            .items(cat.getItems() != null
                                    ? cat.getItems().stream().map(i -> (Object) i).collect(Collectors.toList())
                                    : Collections.emptyList())
                            .sortOrder(cat.getSortOrder())
                            .build())
                    .collect(Collectors.toList())
                : Collections.<ChangelogResponse.CategoryResponse>emptyList();

        return ChangelogResponse.builder()
                .id(changelog.getId())
                .repositoryId(changelog.getRepository().getId())
                .repositoryName(changelog.getRepository().getFullName())
                .version(changelog.getVersion())
                .title(changelog.getTitle())
                .summary(changelog.getSummary())
                .content(changelog.getContent())
                .slug(changelog.getSlug())
                .draft(changelog.getIsDraft())
                .viewCount(changelog.getViewCount())
                .publishedAt(changelog.getPublishedAt())
                .createdAt(changelog.getCreatedAt())
                .categories(categories)
                .build();
    }

    public CommitResponse toCommitResponse(Commit commit) {
        return CommitResponse.builder()
                .id(commit.getId())
                .sha(commit.getSha())
                .message(commit.getMessage())
                .authorName(commit.getAuthorName())
                .authorEmail(commit.getAuthorEmail())
                .category(commit.getCategory())
                .impactScore(commit.getImpactScore())
                .aiTransformedText(commit.getAiTransformedText())
                .isProcessed(commit.getIsProcessed())
                .committedAt(commit.getCommittedAt())
                .build();
    }
}
