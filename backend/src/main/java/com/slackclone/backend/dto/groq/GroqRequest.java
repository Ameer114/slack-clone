package com.slackclone.backend.dto.groq;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class GroqRequest {
    private String model;

    private List<GroqMessage> messages;
}
