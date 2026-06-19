package com.slackclone.backend.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageResponse {

    private UUID messageId;

    private UUID senderId;

    private String username;

    private String content;

    private LocalDateTime createdAt;
}
