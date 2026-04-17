package com.changelogai.repository;

import com.changelogai.entity.Changelog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChangelogRepository extends JpaRepository<Changelog, UUID> {

    Page<Changelog> findByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId, Pageable pageable);

    List<Changelog> findByRepositoryIdAndIsDraftFalseOrderByPublishedAtDesc(UUID repositoryId);

    Page<Changelog> findByRepositoryIdAndIsDraftFalseOrderByPublishedAtDesc(UUID repositoryId, Pageable pageable);

    Optional<Changelog> findBySlug(String slug);

    Optional<Changelog> findByRepositoryIdAndVersion(UUID repositoryId, String version);

    @Modifying
    @Query("UPDATE Changelog c SET c.viewCount = c.viewCount + 1 WHERE c.id = :id")
    void incrementViewCount(@Param("id") UUID id);

    long countByRepositoryId(UUID repositoryId);
}
