package com.changelogai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateChangelogRequest {

    private String title;
    private String summary;
    private String content;
    private String version;
}
