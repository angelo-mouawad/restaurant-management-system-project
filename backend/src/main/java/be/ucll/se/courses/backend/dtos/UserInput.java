package be.ucll.se.courses.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserInput(
        @NotBlank(message = "Name is required")
        @Size(max = 255, message = "Name may not exceed 255 characters")
        String name,

        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 255, message = "Username must be between 3 and 255 characters")
        String username,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 255, message = "Password must be at least 8 characters")
        String password) {
}
