package com.changelogai.dto.response;

import com.changelogai.entity.enums.CommitCategory;
import com.changelogai.entity.enums.ImpactScore;
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
public class CommitResponse {

    private UUID id;
    private String sha;
    private String message;
    private String authorName;
    private String authorEmail;
    private CommitCategory category;
    private ImpactScore impactScore;
    private String aiTransformedText;
    private boolean isProcessed;
    private Instant committedAt;
}
