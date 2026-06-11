package com.slackclone.backend.service;

import com.slackclone.backend.dto.CreateWorkspaceRequest;
import com.slackclone.backend.dto.WorkspaceResponse;
import com.slackclone.backend.entity.Workspace;
import com.slackclone.backend.entity.WorkspaceMember;
import com.slackclone.backend.entity.User;
import com.slackclone.backend.enums.WorkspaceRole;
import com.slackclone.backend.repository.UserRepository;
import com.slackclone.backend.repository.WorkspaceMemberRepository;
import com.slackclone.backend.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkspaceService {
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    public WorkspaceResponse createWorkspace(
            CreateWorkspaceRequest request,
            Authentication authentication
    ) {

        User user = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Workspace workspace = Workspace.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();

        Workspace savedWorkspace =
                workspaceRepository.save(workspace);

        WorkspaceMember ownerMembership =
                WorkspaceMember.builder()
                        .workspace(savedWorkspace)
                        .user(user)
                        .role(WorkspaceRole.OWNER)
                        .build();

        workspaceMemberRepository.save(ownerMembership);

        return WorkspaceResponse.builder()
                .id(savedWorkspace.getId())
                .name(savedWorkspace.getName())
                .description(savedWorkspace.getDescription())
                .build();
    }

    public List<WorkspaceResponse> getMyWorkspaces(
            Authentication authentication
    ) {

        User user = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        List<WorkspaceMember> memberships =
                workspaceMemberRepository.findByUser(user);

        return memberships.stream()
                .map(membership -> {

                    Workspace workspace =
                            membership.getWorkspace();

                    return WorkspaceResponse.builder()
                            .id(workspace.getId())
                            .name(workspace.getName())
                            .description(workspace.getDescription())
                            .build();

                })
                .toList();
    }
}
