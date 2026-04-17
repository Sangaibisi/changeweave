package com.changelogai.repository;

import com.changelogai.entity.Repository;
import com.changelogai.entity.enums.GitProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@org.springframework.stereotype.Repository
public interface RepoRepository extends JpaRepository<Repository, UUID> {

    List<Repository> findByUserIdAndIsActiveTrue(UUID userId);

    List<Repository> findByUserId(UUID userId);

    Optional<Repository> findBySlug(String slug);

    Optional<Repository> findByProviderAndProviderRepoId(GitProvider provider, String providerRepoId);

    Optional<Repository> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByProviderAndProviderRepoId(GitProvider provider, String providerRepoId);

    long countByUserIdAndIsActiveTrue(UUID userId);
}
