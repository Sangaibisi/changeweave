package com.changelogai.entity;

import com.changelogai.entity.enums.CommitCategory;
import com.changelogai.entity.enums.ImpactScore;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "commits",
        uniqueConstraints = @UniqueConstraint(columnNames = {"repository_id", "sha"}))
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Commit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changelog_id")
    private Changelog changelog;

    @Column(nullable = false, length = 40)
    private String sha;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "author_name")
    private String authorName;

    @Column(name = "author_email")
    private String authorEmail;

    @Column(name = "committed_at", nullable = false)
    private Instant committedAt;

    @Type(JsonType.class)
    @Column(name = "files_changed", columnDefinition = "jsonb")
    private List<String> filesChanged;

    @Column(name = "ai_transformed_text", columnDefinition = "TEXT")
    private String aiTransformedText;

    @Enumerated(EnumType.STRING)
    private CommitCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "impact_score")
    @Builder.Default
    private ImpactScore impactScore = ImpactScore.MEDIUM;

    @Column(name = "is_processed")
    @Builder.Default
    private Boolean isProcessed = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
