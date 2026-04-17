package com.changelogai.dto.response;

import com.changelogai.entity.enums.PlanType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private UUID id;
    private String email;
    private String name;
    private String avatarUrl;
    private PlanType planType;
    private boolean emailVerified;
    private boolean githubConnected;
    private boolean gitlabConnected;
    private boolean bitbucketConnected;
    private Instant createdAt;
}
