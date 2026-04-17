package com.changelogai.repository;

import com.changelogai.entity.ChangelogView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChangelogViewRepository extends JpaRepository<ChangelogView, UUID> {

    long countByChangelogId(UUID changelogId);

    @Query("SELECT COUNT(v) FROM ChangelogView v WHERE v.changelog.id = :changelogId AND v.viewedAt >= :since")
    long countByChangelogIdSince(@Param("changelogId") UUID changelogId, @Param("since") Instant since);

    @Query("SELECT COUNT(v) FROM ChangelogView v WHERE v.changelog.repository.id = :repoId")
    long countByRepositoryId(@Param("repoId") UUID repoId);

    @Query("SELECT COUNT(v) FROM ChangelogView v WHERE v.changelog.repository.id = :repoId AND v.viewedAt >= :since")
    long countByRepositoryIdSince(@Param("repoId") UUID repoId, @Param("since") Instant since);

    @Query(value = "SELECT DATE(viewed_at) as day, COUNT(*) as cnt FROM changelog_views v " +
            "JOIN changelogs c ON v.changelog_id = c.id " +
            "WHERE c.repository_id = :repoId AND v.viewed_at >= :since " +
            "GROUP BY DATE(viewed_at) ORDER BY day", nativeQuery = true)
    List<Object[]> dailyViewsByRepoId(@Param("repoId") UUID repoId, @Param("since") Instant since);

    @Query(value = "SELECT c.version, c.title, COUNT(v.id) as cnt FROM changelog_views v " +
            "JOIN changelogs c ON v.changelog_id = c.id " +
            "WHERE c.repository_id = :repoId AND v.viewed_at >= :since " +
            "GROUP BY c.id, c.version, c.title ORDER BY cnt DESC LIMIT 10", nativeQuery = true)
    List<Object[]> topChangelogsByRepoId(@Param("repoId") UUID repoId, @Param("since") Instant since);

    @Query(value = "SELECT COALESCE(referrer, 'Direct') as ref, COUNT(*) as cnt FROM changelog_views v " +
            "JOIN changelogs c ON v.changelog_id = c.id " +
            "WHERE c.repository_id = :repoId AND v.viewed_at >= :since " +
            "GROUP BY ref ORDER BY cnt DESC LIMIT 10", nativeQuery = true)
    List<Object[]> topReferrersByRepoId(@Param("repoId") UUID repoId, @Param("since") Instant since);
}
