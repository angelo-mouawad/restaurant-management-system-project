package be.ucll.se.courses.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NotificationCreateRequest(
        @NotBlank(message = "Username is required") String username,
        @NotBlank(message = "Message is required")
        @Size(max = 1000, message = "Message may not exceed 1000 characters") String message,
        Long stockItemId) {
}
