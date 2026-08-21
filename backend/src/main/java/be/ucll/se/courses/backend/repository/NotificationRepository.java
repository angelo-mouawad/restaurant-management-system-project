package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserUsernameOrderByCreatedAtDesc(String username);
}
