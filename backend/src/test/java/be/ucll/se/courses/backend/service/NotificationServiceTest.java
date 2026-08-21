package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.model.Notification;
import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.NotificationRepository;
import be.ucll.se.courses.backend.repository.StockItemRepository;
import be.ucll.se.courses.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StockItemRepository stockItemRepository;

    @InjectMocks
    private NotificationService notificationService;

    private User user;
    private StockItem stockItem;

    @BeforeEach
    void setUp() {
        user = new User("Angelo", "angelo", "hashed", Role.ADMIN);
        stockItem = new StockItem("Nuggets", 10);
    }

    @Test
    void getNotificationsForUser_returnsNotificationsFromRepository() {
        var notification = new Notification("message", LocalDateTime.now(), null, user);
        when(notificationRepository.findByUserUsernameOrderByCreatedAtDesc("angelo"))
                .thenReturn(List.of(notification));

        var result = notificationService.getNotificationsForUser("angelo");

        assertThat(result).containsExactly(notification);
    }

    @Test
    void getNotificationsForUser_withBlankUsername_throws() {
        assertThatThrownBy(() -> notificationService.getNotificationsForUser("  "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void addNotification_persistsEntityAndReturnsSavedInstance() {
        when(userRepository.findByUsername("angelo")).thenReturn(Optional.of(user));
        when(stockItemRepository.findById(1L)).thenReturn(Optional.of(stockItem));

        var captor = ArgumentCaptor.forClass(Notification.class);
        when(notificationRepository.save(captor.capture()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = notificationService.addNotification("angelo", "Refill stock", 1L);

        assertThat(result.getMessage()).isEqualTo("Refill stock");
        assertThat(result.getUser()).isEqualTo(user);
        assertThat(result.getStockItem()).isEqualTo(stockItem);
        assertThat(result.getCreatedAt()).isNotNull();
        verify(notificationRepository).save(result);
    }

    @Test
    void addNotification_withUnknownUser_throwsEntityNotFound() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.addNotification("ghost", "Hello", null))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void addNotification_withBlankMessage_throwsIllegalArgument() {
        assertThatThrownBy(() -> notificationService.addNotification("angelo", "   ", null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
