package com.slackclone.backend.config;

import com.slackclone.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements HandshakeInterceptor{
    private final JwtService jwtService;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {

        String query = request.getURI().getQuery();

        if (query == null) {
            return false;
        }

        String token = null;

        for (String param : query.split("&")) {

            if (param.startsWith("token=")) {

                token = param.substring(6);
                break;
            }
        }

        if (token == null) {
            return false;
        }

        try {

            String email =
                    jwtService.extractEmail(token);

            attributes.put(
                    "email",
                    email
            );

            return true;

        } catch (Exception e) {

            return false;

        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
    }

}
