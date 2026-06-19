package com.slackclone.backend.controller;

import com.slackclone.backend.dto.ChatMessageResponse;
import com.slackclone.backend.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/channels")
public class MessageController {


    private final MessageService messageService;

    @GetMapping("/{channelId}/messages")
    public List<ChatMessageResponse> getMessages(
            @PathVariable UUID channelId,
            Authentication authentication
    ) {

        return messageService.getChannelMessages(
                channelId,
                authentication.getName()
        );
    }
}
