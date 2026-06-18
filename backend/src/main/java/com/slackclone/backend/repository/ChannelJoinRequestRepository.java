package com.slackclone.backend.repository;

import com.slackclone.backend.entity.Channel;
import com.slackclone.backend.entity.ChannelJoinRequest;
import com.slackclone.backend.entity.User;
import com.slackclone.backend.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChannelJoinRequestRepository extends JpaRepository<ChannelJoinRequest, UUID> {
    Optional<ChannelJoinRequest>
    findByChannelAndUser(
            Channel channel,
            User user
    );

    List<ChannelJoinRequest>
    findByChannelAndStatus(
            Channel channel,
            RequestStatus status
    );
}
