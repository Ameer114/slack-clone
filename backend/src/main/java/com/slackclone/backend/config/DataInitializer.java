package com.slackclone.backend.config;

import com.slackclone.backend.entity.User;
import com.slackclone.backend.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostConstruct
    public void init() {

        String botEmail = "amiebot@system.local";

        if (
                userRepository.findByEmail(botEmail)
                        .isPresent()
        ) {
            return;
        }

        User bot = User.builder()
                .username("amiebot")
                .email(botEmail)
                .password(
                        passwordEncoder.encode(
                                "amibot-secret"
                        )
                )
                .build();

        userRepository.save(bot);
        System.out.println(
                "AmiBot created successfully"
        );
    }
}
