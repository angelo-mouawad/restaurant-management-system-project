package be.ucll.se.courses.backend.config;

import be.ucll.se.courses.backend.dtos.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.io.IOException;

@Configuration
public class SecurityErrorHandlers {

    private final ObjectMapper objectMapper;

    public SecurityErrorHandlers(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Bean
    public AuthenticationEntryPoint jsonAuthenticationEntryPoint() {
        return (request, response, exception) ->
                write(response, HttpStatus.UNAUTHORIZED, "Your session has expired. Please log in again.");
    }

    @Bean
    public AccessDeniedHandler jsonAccessDeniedHandler() {
        return (request, response, exception) ->
                write(response, HttpStatus.FORBIDDEN, "You are not allowed to perform this action.");
    }

    private void write(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(
                response.getWriter(),
                ApiError.of(status.value(), status.getReasonPhrase(), message));
    }
}
