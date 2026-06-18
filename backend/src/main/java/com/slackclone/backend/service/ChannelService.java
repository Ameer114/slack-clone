package com.slackclone.backend.service;


import com.slackclone.backend.dto.ChannelJoinRequestResponse;
import com.slackclone.backend.dto.ChannelMemberResponse;
import com.slackclone.backend.dto.ChannelResponse;
import com.slackclone.backend.dto.CreateChannelRequest;
import com.slackclone.backend.entity.*;
import com.slackclone.backend.enums.RequestStatus;
import com.slackclone.backend.enums.WorkspaceRole;
import com.slackclone.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.slackclone.backend.enums.ChannelRole;
import com.slackclone.backend.entity.ChannelJoinRequest;


import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChannelService {
    private final ChannelRepository channelRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final ChannelJoinRequestRepository channelJoinRequestRepository;

    @Transactional
    public ChannelResponse createChannel(
            UUID workspaceId,
            CreateChannelRequest request,
            Authentication authentication
    ) {

        User user = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Workspace workspace = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() ->
                        new RuntimeException("Workspace not found"));

        WorkspaceMember membership = workspaceMemberRepository
                .findByWorkspaceAndUser(workspace, user)
                .orElseThrow(() ->
                        new RuntimeException(
                                "You are not a member of this workspace"
                        ));
        if (membership.getRole() != WorkspaceRole.OWNER) {
            throw new RuntimeException(
                    "Only workspace owners can create channels"
            );
        }

        if (channelRepository.existsByWorkspaceAndName(
                workspace,
                request.getName()
        )) {
            throw new RuntimeException(
                    "Channel with this name already exists"
            );
        }
        Channel channel = Channel.builder()
                .name(request.getName())
                .description(request.getDescription())
                .isPrivate(request.isPrivate())
                .workspace(workspace)
                .build();

        Channel savedChannel = channelRepository.save(channel);
        ChannelMember ownerMembership =
                ChannelMember.builder()
                        .channel(savedChannel)
                        .user(user)
                        .role(ChannelRole.OWNER)
                        .build();

        channelMemberRepository.save(
                ownerMembership
        );
        return ChannelResponse.builder()
                .id(savedChannel.getId())
                .name(savedChannel.getName())
                .description(savedChannel.getDescription())
                .isPrivate(savedChannel.isPrivate())
                .build();
    }

    public List<ChannelResponse> getChannels(
            UUID workspaceId,
            Authentication authentication
    ) {

        User user = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Workspace workspace = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() ->
                        new RuntimeException("Workspace not found"));

        WorkspaceMember membership =
                workspaceMemberRepository
                        .findByWorkspaceAndUser(
                                workspace,
                                user
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "You are not a member of this workspace"
                                ));

        List<Channel> channels =
                channelRepository.findByWorkspace(workspace);

        return channels.stream()
                .map(channel -> {

                    boolean joined;

                    if (membership.getRole() == WorkspaceRole.OWNER) {

                        joined = true;

                    } else {

                        joined = channelMemberRepository
                                .existsByChannelAndUser(
                                        channel,
                                        user
                                );

                    }

                    return ChannelResponse.builder()
                            .id(channel.getId())
                            .name(channel.getName())
                            .description(channel.getDescription())
                            .isPrivate(channel.isPrivate())
                            .joined(joined)
                            .build();

                })
                .toList();
    }
    @Transactional
    public void joinChannel(
            UUID channelId,
            Authentication authentication
    ) {

        User user = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Channel channel = channelRepository
                .findById(channelId)
                .orElseThrow(() ->
                        new RuntimeException("Channel not found"));

        Workspace workspace = channel.getWorkspace();

        workspaceMemberRepository
                .findByWorkspaceAndUser(
                        workspace,
                        user
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "You are not a member of this workspace"
                        ));

        if (channel.isPrivate()) {

            throw new RuntimeException(
                    "Private channels require access request"
            );

        }

        if (
                channelMemberRepository
                        .existsByChannelAndUser(
                                channel,
                                user
                        )
        ) {

            throw new RuntimeException(
                    "Already joined this channel"
            );

        }

        ChannelMember member =
                ChannelMember.builder()
                        .channel(channel)
                        .user(user)
                        .role(ChannelRole.MEMBER)
                        .build();

        channelMemberRepository.save(member);
    }

    public List<ChannelMemberResponse> getChannelMembers(
            UUID workspaceId,
            UUID channelId,
            Authentication authentication
    ) {

        User currentUser = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Channel channel = channelRepository
                .findById(channelId)
                .orElseThrow(() ->
                        new RuntimeException("Channel not found"));

        if (!channel.getWorkspace().getId().equals(workspaceId)) {

            throw new RuntimeException(
                    "Channel does not belong to workspace"
            );
        }

        WorkspaceMember workspaceMembership =
                workspaceMemberRepository
                        .findByWorkspaceAndUser(
                                channel.getWorkspace(),
                                currentUser
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "You are not a member of this workspace"
                                ));

        boolean canViewMembers = false;

        if (workspaceMembership.getRole() == WorkspaceRole.OWNER) {

            canViewMembers = true;

        } else {

            canViewMembers =
                    channelMemberRepository
                            .existsByChannelAndUser(
                                    channel,
                                    currentUser
                            );

        }

        if (!canViewMembers) {

            throw new RuntimeException(
                    "You are not allowed to view channel members"
            );
        }

        return channelMemberRepository
                .findByChannel(channel)
                .stream()
                .map(member -> ChannelMemberResponse.builder()
                        .userId(member.getUser().getId())
                        .username(member.getUser().getUsername())
                        .email(member.getUser().getEmail())
                        .role(member.getRole())
                        .build())
                .toList();
    }
    @Transactional
    public void requestAccess(
            UUID workspaceId,
            UUID channelId,
            Authentication authentication
    ) {

        User user = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Channel channel = channelRepository
                .findById(channelId)
                .orElseThrow(() ->
                        new RuntimeException("Channel not found"));

        if (!channel.getWorkspace().getId().equals(workspaceId)) {

            throw new RuntimeException(
                    "Channel does not belong to workspace"
            );
        }

        workspaceMemberRepository
                .findByWorkspaceAndUser(
                        channel.getWorkspace(),
                        user
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "You are not a member of this workspace"
                        ));

        if (!channel.isPrivate()) {

            throw new RuntimeException(
                    "Public channels can be joined directly"
            );
        }

        if (
                channelMemberRepository
                        .existsByChannelAndUser(
                                channel,
                                user
                        )
        ) {

            throw new RuntimeException(
                    "Already a member of this channel"
            );
        }

        if (
                channelJoinRequestRepository
                        .findByChannelAndUser(
                                channel,
                                user
                        )
                        .isPresent()
        ) {

            throw new RuntimeException(
                    "Request already exists"
            );
        }

        ChannelJoinRequest request =
                ChannelJoinRequest.builder()
                        .channel(channel)
                        .user(user)
                        .status(RequestStatus.PENDING)
                        .build();

        channelJoinRequestRepository.save(request);
    }
    public List<ChannelJoinRequestResponse> getChannelRequests(
            UUID workspaceId,
            UUID channelId,
            Authentication authentication
    ) {

        User currentUser = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Channel channel = channelRepository
                .findById(channelId)
                .orElseThrow(() ->
                        new RuntimeException("Channel not found"));

        if (!channel.getWorkspace().getId().equals(workspaceId)) {
            throw new RuntimeException(
                    "Channel does not belong to workspace"
            );
        }

        WorkspaceMember workspaceMember =
                workspaceMemberRepository
                        .findByWorkspaceAndUser(
                                channel.getWorkspace(),
                                currentUser
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "You are not a member of this workspace"
                                ));

        boolean allowed = false;

        if (workspaceMember.getRole() == WorkspaceRole.OWNER) {

            allowed = true;

        } else {

            Optional<ChannelMember> channelMember =
                    channelMemberRepository
                            .findByChannelAndUser(
                                    channel,
                                    currentUser
                            );

            if (
                    channelMember.isPresent()
                            &&
                            (
                                    channelMember.get().getRole() == ChannelRole.OWNER
                                            ||
                                            channelMember.get().getRole() == ChannelRole.ADMIN
                            )
            ) {
                allowed = true;
            }
        }

        if (!allowed) {

            throw new RuntimeException(
                    "Not allowed to view requests"
            );
        }

        return channelJoinRequestRepository
                .findByChannelAndStatus(
                        channel,
                        RequestStatus.PENDING
                )
                .stream()
                .map(request ->
                        ChannelJoinRequestResponse.builder()
                                .requestId(request.getId())
                                .userId(request.getUser().getId())
                                .username(request.getUser().getUsername())
                                .email(request.getUser().getEmail())
                                .status(request.getStatus())
                                .build()
                )
                .toList();
    }
    @Transactional
    public void approveRequest(
            UUID requestId,
            Authentication authentication
    ) {

        User currentUser = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        ChannelJoinRequest request =
                channelJoinRequestRepository
                        .findById(requestId)
                        .orElseThrow(() ->
                                new RuntimeException("Request not found"));

        Channel channel = request.getChannel();

        WorkspaceMember workspaceMember =
                workspaceMemberRepository
                        .findByWorkspaceAndUser(
                                channel.getWorkspace(),
                                currentUser
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Not a workspace member"
                                ));

        boolean allowed = false;

        if (workspaceMember.getRole() == WorkspaceRole.OWNER) {

            allowed = true;

        } else {

            Optional<ChannelMember> channelMember =
                    channelMemberRepository
                            .findByChannelAndUser(
                                    channel,
                                    currentUser
                            );

            if (
                    channelMember.isPresent()
                            &&
                            (
                                    channelMember.get().getRole() == ChannelRole.OWNER
                                            ||
                                            channelMember.get().getRole() == ChannelRole.ADMIN
                            )
            ) {
                allowed = true;
            }
        }

        if (!allowed) {

            throw new RuntimeException(
                    "Not authorized to approve requests"
            );
        }

        if (request.getStatus() != RequestStatus.PENDING) {

            throw new RuntimeException(
                    "Request already processed"
            );
        }

        request.setStatus(RequestStatus.APPROVED);

        ChannelMember newMember =
                ChannelMember.builder()
                        .channel(channel)
                        .user(request.getUser())
                        .role(ChannelRole.MEMBER)
                        .build();

        channelMemberRepository.save(newMember);

        channelJoinRequestRepository.save(request);
    }

    @Transactional
    public void rejectRequest(
            UUID requestId,
            Authentication authentication
    ) {

        User currentUser = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        ChannelJoinRequest request =
                channelJoinRequestRepository
                        .findById(requestId)
                        .orElseThrow(() ->
                                new RuntimeException("Request not found"));

        Channel channel = request.getChannel();

        WorkspaceMember workspaceMember =
                workspaceMemberRepository
                        .findByWorkspaceAndUser(
                                channel.getWorkspace(),
                                currentUser
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Not a workspace member"
                                ));

        boolean allowed = false;

        if (workspaceMember.getRole() == WorkspaceRole.OWNER) {

            allowed = true;

        } else {

            Optional<ChannelMember> channelMember =
                    channelMemberRepository
                            .findByChannelAndUser(
                                    channel,
                                    currentUser
                            );

            if (
                    channelMember.isPresent()
                            &&
                            (
                                    channelMember.get().getRole() == ChannelRole.OWNER
                                            ||
                                            channelMember.get().getRole() == ChannelRole.ADMIN
                            )
            ) {
                allowed = true;
            }
        }

        if (!allowed) {

            throw new RuntimeException(
                    "Not authorized to reject requests"
            );
        }

        if (request.getStatus() != RequestStatus.PENDING) {

            throw new RuntimeException(
                    "Request already processed"
            );
        }

        request.setStatus(RequestStatus.REJECTED);

        channelJoinRequestRepository.save(request);
    }

    @Transactional
    public void promoteToAdmin(
            UUID workspaceId,
            UUID channelId,
            UUID userId,
            Authentication authentication
    ) {

        User currentUser = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Channel channel = channelRepository
                .findById(channelId)
                .orElseThrow(() ->
                        new RuntimeException("Channel not found"));

        if (!channel.getWorkspace().getId().equals(workspaceId)) {

            throw new RuntimeException(
                    "Channel does not belong to workspace"
            );
        }

        WorkspaceMember workspaceMember =
                workspaceMemberRepository
                        .findByWorkspaceAndUser(
                                channel.getWorkspace(),
                                currentUser
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Not a workspace member"
                                ));

        boolean allowed = false;

        if (workspaceMember.getRole() == WorkspaceRole.OWNER) {

            allowed = true;

        } else {

            Optional<ChannelMember> myMembership =
                    channelMemberRepository
                            .findByChannelAndUser(
                                    channel,
                                    currentUser
                            );

            if (
                    myMembership.isPresent()
                            &&
                            myMembership.get().getRole() == ChannelRole.OWNER
            ) {
                allowed = true;
            }
        }

        if (!allowed) {

            throw new RuntimeException(
                    "Not authorized"
            );
        }

        User targetUser = userRepository
                .findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        ChannelMember targetMembership =
                channelMemberRepository
                        .findByChannelAndUser(
                                channel,
                                targetUser
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "User is not in channel"
                                ));

        if (targetMembership.getRole() == ChannelRole.OWNER) {

            throw new RuntimeException(
                    "Cannot promote owner"
            );
        }
        if (
                targetMembership.getRole()
                        == ChannelRole.ADMIN
        ) {

            throw new RuntimeException(
                    "User is already an admin"
            );
        }

        targetMembership.setRole(ChannelRole.ADMIN);

        channelMemberRepository.save(targetMembership);
    }
}
