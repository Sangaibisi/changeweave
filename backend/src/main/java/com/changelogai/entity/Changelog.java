package com.changelogai.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "changelogs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"repository_id", "version"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Changelog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @Column(nullable = false)
    private String version;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Type(JsonType.class)
    @Column(name = "raw_commits", columnDefinition = "jsonb")
    private List<Map<String, Object>> rawCommits;

    @Type(JsonType.class)
    @Column(name = "ai_metadata", columnDefinition = "jsonb")
    private Map<String, Object> aiMetadata;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "is_draft")
    @Builder.Default
    private Boolean isDraft = true;

    private String slug;

    @Column(name = "view_count")
    @Builder.Default
    private Integer viewCount = 0;

    @OneToMany(mappedBy = "changelog", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ChangelogCategory> categories = new ArrayList<>();

    @OneToMany(mappedBy = "changelog")
    @Builder.Default
    private List<Commit> commits = new ArrayList<>();
}
