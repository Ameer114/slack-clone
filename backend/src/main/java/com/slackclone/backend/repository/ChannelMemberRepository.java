package com.slackclone.backend.repository;


import com.slackclone.backend.entity.Channel;
import com.slackclone.backend.entity.ChannelMember;
import com.slackclone.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface ChannelMemberRepository  extends JpaRepository<ChannelMember, UUID> {
    List<ChannelMember> findByChannel(Channel channel);

    List<ChannelMember> findByUser(User user);

    Optional<ChannelMember> findByChannelAndUser(
            Channel channel,
            User user
    );

    boolean existsByChannelAndUser(
            Channel channel,
            User user
    );
}
