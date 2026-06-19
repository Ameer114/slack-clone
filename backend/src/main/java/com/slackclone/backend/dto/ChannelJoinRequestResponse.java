package com.slackclone.backend.dto;

import com.slackclone.backend.enums.RequestStatus;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelJoinRequestResponse {

    private UUID requestId;

    private UUID userId;

    private String username;

    private String email;

    private RequestStatus status;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatMessageRequest {

        private UUID channelId;

        private String content;
    }
}
