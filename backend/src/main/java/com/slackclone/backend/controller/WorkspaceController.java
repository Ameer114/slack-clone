package com.slackclone.backend.controller;

import com.slackclone.backend.dto.CreateWorkspaceRequest;
import com.slackclone.backend.dto.WorkspaceResponse;
import com.slackclone.backend.service.WorkspaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @PostMapping
    public WorkspaceResponse createWorkspace(
            @Valid @RequestBody CreateWorkspaceRequest request,
            Authentication authentication
    ) {

        return workspaceService.createWorkspace(
                request,
                authentication
        );
    }
}
