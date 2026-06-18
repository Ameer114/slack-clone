package com.slackclone.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateChannelRequest {

    @NotBlank(message = "Channel name is required")
    private String name;

    private String description;

    private boolean isPrivate;
}
