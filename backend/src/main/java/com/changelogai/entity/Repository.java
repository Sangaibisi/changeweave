package com.changelogai.entity;

import com.changelogai.entity.enums.GitProvider;
import com.changelogai.entity.enums.RepoVisibility;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "repositories",
        uniqueConstraints = @UniqueConstraint(columnNames = {"provider", "provider_repo_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Repository extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private GitProvider provider = GitProvider.GITHUB;

    @Column(name = "provider_repo_id", nullable = false)
    private String providerRepoId;

    @Column(name = "provider_repo_url", nullable = false)
    private String providerRepoUrl;

    @Column(name = "default_branch")
    @Builder.Default
    private String defaultBranch = "main";

    private String description;

    @Column(name = "webhook_id")
    private String webhookId;

    @Column(name = "webhook_secret")
    private String webhookSecret;

    @Column(unique = true)
    private String slug;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> settings = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RepoVisibility visibility = RepoVisibility.PUBLIC;

    @Column(name = "access_token")
    private String accessToken;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @OneToMany(mappedBy = "repository", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Changelog> changelogs = new ArrayList<>();

    @OneToMany(mappedBy = "repository", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Commit> commits = new ArrayList<>();
}
