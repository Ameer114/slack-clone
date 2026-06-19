package com.slackclone.backend.repository;

import com.slackclone.backend.entity.Channel;
import com.slackclone.backend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MessageRepository  extends JpaRepository<Message, UUID> {
    List<Message> findByChannelOrderByCreatedAtAsc(
            Channel channel
    );

    List<Message> findTop20ByChannelOrderByCreatedAtDesc(
            Channel channel
    );
}
