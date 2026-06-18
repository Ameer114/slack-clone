package com.slackclone.backend.entity;


import com.slackclone.backend.enums.ChannelRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "channel_members",
        uniqueConstraints = {
                @UniqueConstraint(
                        columnNames = {
                                "channel_id",
                                "user_id"
                        }
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChannelRole role;

    private LocalDateTime joinedAt;

    @PrePersist
    public void onCreate() {
        joinedAt = LocalDateTime.now();
    }
}
