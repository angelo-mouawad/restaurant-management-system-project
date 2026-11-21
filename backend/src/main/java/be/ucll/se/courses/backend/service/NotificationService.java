package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.NotificationResponse;
import be.ucll.se.courses.backend.dtos.PageResponse;
import be.ucll.se.courses.backend.enums.NotificationType;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.model.Notification;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.NotificationRepository;
import be.ucll.se.courses.backend.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Stores notifications and serves each user their own. Only the event listener creates them. */
@Service
@Transactional
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final ObjectMapper objectMapper;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               CurrentUserService currentUserService,
                               ObjectMapper objectMapper) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.objectMapper = objectMapper;
    }

    // ------------------------------------------------------------------ reading, for the signed-in user

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> listMine(boolean unreadOnly, int page, int size) {
        final Long userId = currentUserService.get().getId();
        final Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        final var result = unreadOnly
                ? notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, pageable)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return PageResponse.of(result, this::toResponse);
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return notificationRepository.countByUserIdAndReadAtIsNull(currentUserService.get().getId());
    }

    public NotificationResponse markRead(Long id) {
        final Notification notification = notificationRepository.findByIdAndUserId(id, currentUserService.get().getId())
                .orElseThrow(() -> new EntityNotFoundException("Notification not found."));
        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now());
        }
        return toResponse(notification);
    }

    public int markAllRead() {
        return notificationRepository.markAllRead(currentUserService.get().getId(), LocalDateTime.now());
    }

    // ------------------------------------------------------------------ writing, from domain events

    public void notify(User recipient, NotificationType type, String title, String message,
                       Map<String, Object> params, String link) {
        if (recipient == null || !recipient.isActive()) {
            return;
        }
        notificationRepository.save(new Notification(recipient, type, title, message, writeParams(params), link));
    }

    public void notifyAll(Collection<User> recipients, NotificationType type, String title, String message,
                          Map<String, Object> params, String link) {
        recipients.stream().filter(Objects::nonNull).distinct()
                .forEach(user -> notify(user, type, title, message, params, link));
    }

    /** Everyone who runs the restaurant: managers and admins. */
    @Transactional(readOnly = true)
    public List<User> management() {
        return userRepository.findByRoleInAndActiveTrueOrderByName(List.of(Role.MANAGER, Role.ADMIN));
    }

    /** The people an employee reports to: their own manager, or every manager if they have none. */
    @Transactional(readOnly = true)
    public List<User> managersOf(User employee) {
        final User manager = employee.getManager();
        if (manager != null && manager.isActive() && manager.isManagement()) {
            return List.of(manager);
        }
        final List<User> managers = userRepository.findByRoleInAndActiveTrueOrderByName(List.of(Role.MANAGER));
        return managers.isEmpty() ? userRepository.findByRoleInAndActiveTrueOrderByName(List.of(Role.ADMIN)) : managers;
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                readParams(notification.getParams()),
                notification.getLink(),
                notification.getCreatedAt(),
                notification.getReadAt() != null);
    }

    private String writeParams(Map<String, Object> params) {
        if (params == null || params.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(params);
        } catch (JsonProcessingException exception) {
            log.warn("Could not store notification params: {}", exception.getMessage());
            return null;
        }
    }

    private Map<String, Object> readParams(String params) {
        if (params == null || params.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(params, new TypeReference<>() {});
        } catch (JsonProcessingException exception) {
            return Map.of();
        }
    }
}
