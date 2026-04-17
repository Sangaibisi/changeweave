package com.changelogai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangelogResponse {

    private UUID id;
    private UUID repositoryId;
    private String repositoryName;
    private String version;
    private String title;
    private String summary;
    private String content;
    private String slug;
    private boolean draft;
    private int viewCount;
    private Instant publishedAt;
    private Instant createdAt;
    private List<CategoryResponse> categories;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryResponse {
        private String category;
        private String title;
        private List<Object> items;
        private int sortOrder;
    }
}
