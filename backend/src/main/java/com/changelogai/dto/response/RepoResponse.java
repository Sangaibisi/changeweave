package com.changelogai.dto.response;

import com.changelogai.entity.enums.GitProvider;
import com.changelogai.entity.enums.RepoVisibility;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepoResponse {

    private UUID id;
    private String name;
    private String fullName;
    private GitProvider provider;
    private String providerRepoUrl;
    private String defaultBranch;
    private String description;
    private String slug;
    private RepoVisibility visibility;
    private String accessToken;
    private boolean isActive;
    private long changelogCount;
    private long unprocessedCommitCount;
    private Map<String, Object> settings;
    private Instant createdAt;
}
