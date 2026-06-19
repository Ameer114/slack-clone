package com.slackclone.backend.controller;

import com.slackclone.backend.dto.ChatMessageRequest;
import com.slackclone.backend.dto.ChatMessageResponse;
import com.slackclone.backend.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void sendMessage(
            ChatMessageRequest request,
            Principal principal
    ) {

        ChatMessageResponse response =
                messageService.saveMessage(
                        request.getChannelId(),
                        request.getContent(),
                        principal.getName()
                );

        messagingTemplate.convertAndSend(
                "/topic/channels/"
                        + request.getChannelId(),
                response
        );
    }

}
