package com.slackclone.backend.service;

import com.slackclone.backend.dto.ChatMessageResponse;
import com.slackclone.backend.entity.*;
import com.slackclone.backend.enums.WorkspaceRole;
import com.slackclone.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessageService {
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    private void validateChannelAccess(
            User user,
            Channel channel
    ) {

        WorkspaceMember workspaceMember =
                workspaceMemberRepository
                        .findByWorkspaceAndUser(
                                channel.getWorkspace(),
                                user
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Not a workspace member"
                                ));

        if (
                workspaceMember.getRole()
                        == WorkspaceRole.OWNER
        ) {
            return;
        }

        boolean isChannelMember =
                channelMemberRepository
                        .existsByChannelAndUser(
                                channel,
                                user
                        );

        if (!isChannelMember) {

            throw new RuntimeException(
                    "Access denied"
            );
        }
    }
    @Transactional
    public ChatMessageResponse saveMessage(
            UUID channelId,
            String content,
            String email
    ) {

        if (
                content == null
                        ||
                        content.isBlank()
        ) {

            throw new RuntimeException(
                    "Message cannot be empty"
            );
        }

        User sender =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "User not found"
                                ));

        Channel channel =
                channelRepository
                        .findById(channelId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Channel not found"
                                ));

        validateChannelAccess(
                sender,
                channel
        );

        Message message =
                Message.builder()
                        .content(content)
                        .sender(sender)
                        .channel(channel)
                        .build();

        Message savedMessage =
                messageRepository.save(message);

        return ChatMessageResponse.builder()
                .messageId(savedMessage.getId())
                .senderId(sender.getId())
                .username(sender.getUsername())
                .content(savedMessage.getContent())
                .createdAt(savedMessage.getCreatedAt())
                .build();
    }
    public List<ChatMessageResponse> getChannelMessages(
            UUID channelId,
            String email
    ) {

        User user =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "User not found"
                                ));

        Channel channel =
                channelRepository
                        .findById(channelId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Channel not found"
                                ));

        validateChannelAccess(
                user,
                channel
        );

        return messageRepository
                .findByChannelOrderByCreatedAtAsc(
                        channel
                )
                .stream()
                .map(message ->
                        ChatMessageResponse.builder()
                                .messageId(
                                        message.getId()
                                )
                                .senderId(
                                        message.getSender().getId()
                                )
                                .username(
                                        message.getSender().getUsername()
                                )
                                .content(
                                        message.getContent()
                                )
                                .createdAt(
                                        message.getCreatedAt()
                                )
                                .build()
                )
                .toList();
    }
}
