package com.changelogai.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "changelog_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangelogCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changelog_id", nullable = false)
    private Changelog changelog;

    @Column(nullable = false)
    private String category;

    private String title;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> items;

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;
}
