package be.ucll.se.courses.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** One employee working one stretch of time on one day. */
@Entity
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "period_id", nullable = false)
    private SchedulePeriod period;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** The template it was made from. Null for a custom shift, or after its type was deleted. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_type_id")
    private ShiftType shiftType;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(length = 500)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    protected Shift() {}

    public Shift(SchedulePeriod period, User user, ShiftType shiftType, LocalDate date,
                 LocalTime startTime, LocalTime endTime, String note, User createdBy) {
        this.period = period;
        this.user = user;
        this.shiftType = shiftType;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.note = note;
        this.createdBy = createdBy;
    }

    /** Minutes from midnight of {@link #date}; a shift past midnight ends above 1440. */
    public int startMinute() {
        return startTime.getHour() * 60 + startTime.getMinute();
    }

    public int endMinute() {
        final int end = endTime.getHour() * 60 + endTime.getMinute();
        return end <= startMinute() ? end + 24 * 60 : end;
    }

    public double getHours() {
        return Duration.ofMinutes(endMinute() - startMinute()).toMinutes() / 60.0;
    }

    public boolean overlaps(Shift other) {
        return date.equals(other.date) && startMinute() < other.endMinute() && other.startMinute() < endMinute();
    }

    public void reschedule(SchedulePeriod period, User user, ShiftType shiftType, LocalDate date,
                           LocalTime startTime, LocalTime endTime, String note) {
        this.period = period;
        this.user = user;
        this.shiftType = shiftType;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.note = note;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public SchedulePeriod getPeriod() { return period; }
    public User getUser() { return user; }
    public ShiftType getShiftType() { return shiftType; }
    public LocalDate getDate() { return date; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public String getNote() { return note; }
    public User getCreatedBy() { return createdBy; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
