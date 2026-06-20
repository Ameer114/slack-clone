package com.slackclone.backend.service;

import com.slackclone.backend.dto.groq.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GroqService {


    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.model}")
    private String model;

    private final RestClient.Builder restClientBuilder;

    private static final String SYSTEM_PROMPT = """
You are AmiBot.

You are a witty, playful and friendly member of the group.

You are not a formal assistant.

You can joke, laugh and react naturally.

If someone says something obviously wrong,
you may playfully point it out.

Do not be toxic.

Do not be rude.

Messages written by amiebot are your own previous responses.

Maintain continuity with them.

Focus primarily on the latest messages.

Keep responses concise.

However:

- Never invent facts.
- If you are unsure, say you are unsure.
- If the answer depends on current real-world information that is not present in the conversation, say so.
- Do not hallucinate statistics, scores, dates or events.
- Separate jokes from factual answers.
""";

    public String generateReply(
            String context,
            String latestMessage
    ) {

        RestClient client =
                restClientBuilder.build();

        String prompt =
                """
Recent channel conversation:

%s

Latest message directed to you:

%s
"""
                        .formatted(
                                context,
                                latestMessage
                        );

        GroqRequest request =
                GroqRequest.builder()
                        .model(model)
                        .messages(
                                List.of(
                                        new GroqMessage(
                                                "system",
                                                SYSTEM_PROMPT
                                        ),
                                        new GroqMessage(
                                                "user",
                                                prompt
                                        )
                                )
                        )
                        .build();

        GroqResponse response =
                client.post()
                        .uri(
                                "https://api.groq.com/openai/v1/chat/completions"
                        )
                        .header(
                                HttpHeaders.AUTHORIZATION,
                                "Bearer " + apiKey
                        )
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .body(request)
                        .retrieve()
                        .body(
                                GroqResponse.class
                        );

        return response
                .getChoices()
                .get(0)
                .getMessage()
                .getContent();
    }
}
