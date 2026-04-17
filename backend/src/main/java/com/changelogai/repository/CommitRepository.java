package com.changelogai.repository;

import com.changelogai.entity.Commit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommitRepository extends JpaRepository<Commit, UUID> {

    List<Commit> findByRepositoryIdAndIsProcessedFalseOrderByCommittedAtAsc(UUID repositoryId);

    Page<Commit> findByRepositoryIdOrderByCommittedAtDesc(UUID repositoryId, Pageable pageable);

    List<Commit> findByChangelogId(UUID changelogId);

    Optional<Commit> findByRepositoryIdAndSha(UUID repositoryId, String sha);

    boolean existsByRepositoryIdAndSha(UUID repositoryId, String sha);

    List<Commit> findByRepositoryIdAndCommittedAtBetweenOrderByCommittedAtAsc(
            UUID repositoryId, Instant from, Instant to);

    long countByRepositoryIdAndIsProcessedFalse(UUID repositoryId);
}
