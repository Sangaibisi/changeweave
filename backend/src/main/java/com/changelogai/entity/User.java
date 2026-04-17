package com.changelogai.entity;

import com.changelogai.entity.enums.PlanType;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String email;

    private String name;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type")
    @Builder.Default
    private PlanType planType = PlanType.FREE;

    @Column(name = "stripe_customer_id")
    private String stripeCustomerId;

    @Column(name = "github_id", unique = true)
    private String githubId;

    @Column(name = "github_access_token")
    private String githubAccessToken;

    @Column(name = "gitlab_id", unique = true)
    private String gitlabId;

    @Column(name = "gitlab_access_token")
    private String gitlabAccessToken;

    @Column(name = "bitbucket_id", unique = true)
    private String bitbucketId;

    @Column(name = "bitbucket_access_token")
    private String bitbucketAccessToken;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Repository> repositories = new ArrayList<>();
}
