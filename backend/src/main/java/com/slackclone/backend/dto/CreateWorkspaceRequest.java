package com.slackclone.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateWorkspaceRequest {
    @NotBlank(message = "Workspace name is required")
    private String name;

    private String description;
}
