package com.slackclone.backend.repository;

import com.slackclone.backend.entity.Channel;
import com.slackclone.backend.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChannelRepository extends JpaRepository<Channel, UUID> {
    List<Channel> findByWorkspace(Workspace workspace);

    boolean existsByWorkspaceAndName(
            Workspace workspace,
            String name
    );
}
