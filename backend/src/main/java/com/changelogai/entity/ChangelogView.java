package com.changelogai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "changelog_views")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangelogView {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changelog_id", nullable = false)
    private Changelog changelog;

    @Column(name = "viewed_at")
    @Builder.Default
    private Instant viewedAt = Instant.now();

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    private String referrer;

    @Column(name = "country_code", length = 2)
    private String countryCode;
}
