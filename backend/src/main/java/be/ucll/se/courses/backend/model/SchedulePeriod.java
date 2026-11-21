package be.ucll.se.courses.backend.model;

import be.ucll.se.courses.backend.enums.PeriodStatus;
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

import java.time.LocalDate;
import java.time.LocalDateTime;

/** One planning week, Monday to Sunday. */
@Entity
@Table(name = "schedule_period")
public class SchedulePeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Always a Monday. */
    @Column(name = "week_start", nullable = false, unique = true)
    private LocalDate weekStart;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PeriodStatus status = PeriodStatus.DRAFT;

    /** Once locked, employees can no longer change their availability for this week. */
    @Column(name = "availability_locked", nullable = false)
    private boolean availabilityLocked;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "published_by")
    private User publishedBy;

    protected SchedulePeriod() {}

    public SchedulePeriod(LocalDate weekStart) {
        this.weekStart = weekStart;
    }

    public boolean isPublished() {
        return status == PeriodStatus.PUBLISHED;
    }

    public LocalDate getWeekEnd() {
        return weekStart.plusDays(6);
    }

    public Long getId() { return id; }
    public LocalDate getWeekStart() { return weekStart; }
    public PeriodStatus getStatus() { return status; }
    public void setStatus(PeriodStatus status) { this.status = status; }
    public boolean isAvailabilityLocked() { return availabilityLocked; }
    public void setAvailabilityLocked(boolean availabilityLocked) { this.availabilityLocked = availabilityLocked; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }
    public User getPublishedBy() { return publishedBy; }
    public void setPublishedBy(User publishedBy) { this.publishedBy = publishedBy; }
}
