package com.changelogai.dto.request;

import com.changelogai.entity.enums.RepoVisibility;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRepoVisibilityRequest {

    @NotNull(message = "Visibility is required")
    private RepoVisibility visibility;
}
