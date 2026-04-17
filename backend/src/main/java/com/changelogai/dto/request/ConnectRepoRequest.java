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
public class ConnectRepoRequest {

    @NotBlank(message = "Repository full name is required (e.g. owner/repo)")
    private String fullName;

    private String slug;
}
