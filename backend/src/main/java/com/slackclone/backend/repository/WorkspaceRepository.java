package com.slackclone.backend.repository;

import com.slackclone.backend.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
public interface WorkspaceRepository  extends JpaRepository<Workspace, UUID>  {

}
