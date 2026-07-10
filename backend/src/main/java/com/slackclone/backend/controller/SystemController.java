package com.slackclone.backend.controller;

import com.slackclone.backend.service.SystemService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
public class SystemController {
    private final SystemService systemService;

    public SystemController(SystemService systemService) {
        this.systemService = systemService;
    }

    @GetMapping("/keep-alive")
    public ResponseEntity<String> keepAlive() {

        systemService.keepAlive();

        return ResponseEntity.ok("Backend and Database are alive!");
    }
}
