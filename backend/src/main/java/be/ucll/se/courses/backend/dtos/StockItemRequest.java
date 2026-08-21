package be.ucll.se.courses.backend.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StockItemRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 255, message = "Name may not exceed 255 characters")
        String name,

        @Min(value = 0, message = "Quantity may not be negative")
        int quantity) {
}
