package be.ucll.se.courses.backend.model;

import be.ucll.se.courses.backend.enums.ShiftChangeType;
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
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** An entry in a published week's change log. */
@Entity
@Table(name = "shift_change")
public class ShiftChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "period_id", nullable = false)
    private SchedulePeriod period;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "affected_user_id")
    private User affectedUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by")
    private User changedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", nullable = false)
    private ShiftChangeType changeType;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    protected ShiftChange() {}

    public ShiftChange(SchedulePeriod period, User affectedUser, User changedBy, ShiftChangeType changeType, String description) {
        this.period = period;
        this.affectedUser = affectedUser;
        this.changedBy = changedBy;
        this.changeType = changeType;
        this.description = description;
    }

    public Long getId() { return id; }
    public SchedulePeriod getPeriod() { return period; }
    public User getAffectedUser() { return affectedUser; }
    public User getChangedBy() { return changedBy; }
    public ShiftChangeType getChangeType() { return changeType; }
    public String getDescription() { return description; }
    public LocalDateTime getChangedAt() { return changedAt; }
}
