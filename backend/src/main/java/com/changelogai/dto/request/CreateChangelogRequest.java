package com.changelogai.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateChangelogRequest {

    @NotBlank(message = "Version is required")
    private String version;

    private String title;

    private boolean autoGenerate;
}
