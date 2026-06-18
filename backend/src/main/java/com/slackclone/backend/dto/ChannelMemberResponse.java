package com.slackclone.backend.dto;

import com.slackclone.backend.enums.ChannelRole;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelMemberResponse {
    private UUID userId;

    private String username;

    private String email;

    private ChannelRole role;
}
