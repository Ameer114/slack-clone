package com.slackclone.backend.service;

import com.slackclone.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class SystemService {

    private final UserRepository userRepository;

    public SystemService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public void keepAlive() {
        userRepository.count();
    }
}
