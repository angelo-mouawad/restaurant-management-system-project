package be.ucll.se.courses.backend.dtos;

import be.ucll.se.courses.backend.model.Notification;

public record NotificationResponse(
        Long id,
        String message,
        String createdAt,
        Long stockItemId,
        Long userId) {

    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getMessage(),
                notification.getCreatedAt() == null ? null : notification.getCreatedAt().toString(),
                notification.getStockItem() == null ? null : notification.getStockItem().getId(),
                notification.getUser() == null ? null : notification.getUser().getId());
    }
}
