package com.slackclone.backend.repository;

import com.slackclone.backend.entity.User;
import com.slackclone.backend.entity.Workspace;
import com.slackclone.backend.entity.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface WorkspaceMemberRepository  extends JpaRepository<WorkspaceMember, UUID> {

    List<WorkspaceMember> findByUser(User user);

    Optional<WorkspaceMember>
    findByWorkspaceAndUser(
            Workspace workspace,
            User user
    );

    boolean existsByWorkspaceAndUser(
            Workspace workspace,
            User user
    );

}
