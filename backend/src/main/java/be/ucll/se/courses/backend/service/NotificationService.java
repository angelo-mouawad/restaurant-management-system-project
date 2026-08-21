package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.model.Notification;
import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.NotificationRepository;
import be.ucll.se.courses.backend.repository.StockItemRepository;
import be.ucll.se.courses.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final StockItemRepository stockItemRepository;

    @Autowired
    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               StockItemRepository stockItemRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.stockItemRepository = stockItemRepository;
    }

    @Transactional(readOnly = true)
    public List<Notification> getNotificationsForUser(String username) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Username must be provided");
        }
        return notificationRepository.findByUserUsernameOrderByCreatedAtDesc(username);
    }

    public Notification addNotification(String username, String message, Long stockItemId) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Username must be provided");
        }
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("Message must be provided");
        }

        final User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User with username '" + username + "' not found"));

        final StockItem stockItem = stockItemId == null ? null : stockItemRepository.findById(stockItemId)
                .orElseThrow(() -> new EntityNotFoundException("Stock item with id " + stockItemId + " not found"));

        return notificationRepository.save(new Notification(message.trim(), LocalDateTime.now(), stockItem, user));
    }
}
