package be.ucll.se.courses.backend.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record QuantityChangeRequest(
        @NotNull(message = "Amount is required")
        @Min(value = 1, message = "Amount must be at least 1")
        Integer amount) {
}
