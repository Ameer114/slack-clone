package com.slackclone.backend.controller;

import com.slackclone.backend.dto.ChannelJoinRequestResponse;
import com.slackclone.backend.dto.ChannelMemberResponse;
import com.slackclone.backend.dto.ChannelResponse;
import com.slackclone.backend.dto.CreateChannelRequest;
import com.slackclone.backend.service.ChannelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/channels")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelService channelService;

    @PostMapping
    public ChannelResponse createChannel(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateChannelRequest request,
            Authentication authentication
    ) {

        return channelService.createChannel(
                workspaceId,
                request,
                authentication
        );
    }

    @GetMapping
    public List<ChannelResponse> getChannels(
            @PathVariable UUID workspaceId,
            Authentication authentication
    ) {

        return channelService.getChannels(
                workspaceId,
                authentication
        );
    }

    @PostMapping("/{channelId}/join")
    public void joinChannel(
            @PathVariable UUID channelId,
            Authentication authentication
    ) {

        channelService.joinChannel(
                channelId,
                authentication
        );

    }

    @GetMapping("/{channelId}/members")
    public List<ChannelMemberResponse> getChannelMembers(
            @PathVariable UUID workspaceId,
            @PathVariable UUID channelId,
            Authentication authentication
    ) {

        return channelService.getChannelMembers(
                workspaceId,
                channelId,
                authentication
        );

    }
    @PostMapping("/{channelId}/request-access")
    public void requestAccess(
            @PathVariable UUID workspaceId,
            @PathVariable UUID channelId,
            Authentication authentication
    ) {

        channelService.requestAccess(
                workspaceId,
                channelId,
                authentication
        );

    }
    @GetMapping("/{channelId}/requests")
    public List<ChannelJoinRequestResponse> getChannelRequests(
            @PathVariable UUID workspaceId,
            @PathVariable UUID channelId,
            Authentication authentication
    ) {

        return channelService.getChannelRequests(
                workspaceId,
                channelId,
                authentication
        );
    }
    @PostMapping("/requests/{requestId}/approve")
    public void approveRequest(
            @PathVariable UUID requestId,
            Authentication authentication
    ) {

        channelService.approveRequest(
                requestId,
                authentication
        );
    }

    @PostMapping("/requests/{requestId}/reject")
    public void rejectRequest(
            @PathVariable UUID requestId,
            Authentication authentication
    ) {

        channelService.rejectRequest(
                requestId,
                authentication
        );
    }

    @PostMapping(
            "/{channelId}/members/{userId}/promote"
    )
    public void promoteToAdmin(
            @PathVariable UUID workspaceId,
            @PathVariable UUID channelId,
            @PathVariable UUID userId,
            Authentication authentication
    ) {

        channelService.promoteToAdmin(
                workspaceId,
                channelId,
                userId,
                authentication
        );
    }
}
