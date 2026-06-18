package com.slackclone.backend.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelResponse {

    private UUID id;

    private String name;

    private String description;

    private boolean isPrivate;

    boolean joined;
}
