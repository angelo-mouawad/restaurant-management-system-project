package be.ucll.se.courses.backend.model;

import be.ucll.se.courses.backend.enums.NotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import java.time.LocalDateTime;

/**
 * Stored per recipient. The title and message are written in English; type and params let the
 * frontend render the same notice in the reader's language.
 */
@Entity
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    /** JSON object with the values the message was built from. */
    @Column(length = 2000)
    private String params;

    /** Frontend route the notification points to. */
    private String link;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "read_at")
    private LocalDateTime readAt;

    protected Notification() {}

    public Notification(User user, NotificationType type, String title, String message, String params, String link) {
        this.user = user;
        this.type = type;
        this.title = title;
        this.message = message;
        this.params = params;
        this.link = link;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public NotificationType getType() { return type; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getParams() { return params; }
    public String getLink() { return link; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    /** Seed data only, to spread demo notifications over past days. */
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
}
