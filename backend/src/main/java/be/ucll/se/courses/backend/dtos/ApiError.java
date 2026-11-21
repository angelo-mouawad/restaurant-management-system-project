package be.ucll.se.courses.backend.dtos;

import java.time.LocalDateTime;
import java.util.List;

/**
 * The one error shape every endpoint returns. {@code code} is a stable key the frontend can act on
 * (for example SHIFT_WARNINGS to offer "assign anyway"); {@code details} lists field errors or warnings.
 */
public record ApiError(
        LocalDateTime timestamp,
        int status,
        String error,
        String code,
        String message,
        List<String> details) {

    public static ApiError of(int status, String error, String message) {
        return new ApiError(LocalDateTime.now(), status, error, null, message, List.of());
    }

    public static ApiError of(int status, String error, String message, List<String> details) {
        return new ApiError(LocalDateTime.now(), status, error, null, message, details);
    }

    public static ApiError withCode(int status, String error, String code, String message, List<String> details) {
        return new ApiError(LocalDateTime.now(), status, error, code, message, details);
    }
}
