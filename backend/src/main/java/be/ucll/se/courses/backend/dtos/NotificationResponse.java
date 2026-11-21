package be.ucll.se.courses.backend.dtos;

import be.ucll.se.courses.backend.enums.NotificationType;

import java.time.LocalDateTime;
import java.util.Map;

public record NotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String message,
        Map<String, Object> params,
        String link,
        LocalDateTime createdAt,
        boolean read) {
}
