package be.ucll.se.courses.backend.controller;

import be.ucll.se.courses.backend.dtos.NotificationCreateRequest;
import be.ucll.se.courses.backend.dtos.NotificationResponse;
import be.ucll.se.courses.backend.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @Autowired
    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/{username}")
    @PreAuthorize("hasRole('ADMIN') or #username == authentication.name")
    public List<NotificationResponse> getNotifications(@PathVariable String username) {
        return notificationService.getNotificationsForUser(username)
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @PostMapping
    public NotificationResponse addNotification(@Valid @RequestBody NotificationCreateRequest request) {
        return NotificationResponse.from(
                notificationService.addNotification(request.username(), request.message(), request.stockItemId()));
    }
}
