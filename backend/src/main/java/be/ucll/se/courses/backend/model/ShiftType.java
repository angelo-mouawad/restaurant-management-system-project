package be.ucll.se.courses.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

/** A reusable shift template, such as Morning 09:00 to 15:00, with the staff it needs. */
@Entity
@Table(name = "shift_type")
public class ShiftType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    /** May be earlier than the start, meaning the shift ends after midnight. */
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "min_staff", nullable = false)
    private int minStaff = 1;

    /** Comma separated weekdays the shift runs on. Staffing is only checked on those days. */
    @Column(nullable = false, length = 80)
    private String days = ALL_DAYS;

    private static final String ALL_DAYS = Arrays.stream(DayOfWeek.values()).map(Enum::name).collect(Collectors.joining(","));

    /** A palette key the frontend maps to its own colours (teal, amber, indigo, rose, sky, slate). */
    @Column(nullable = false)
    private String color = "teal";

    @Column(nullable = false)
    private boolean active = true;

    protected ShiftType() {}

    public ShiftType(String name, LocalTime startTime, LocalTime endTime, int minStaff, String color) {
        this.name = name;
        this.startTime = startTime;
        this.endTime = endTime;
        this.minStaff = minStaff;
        this.color = color;
    }

    public boolean runsOn(DayOfWeek day) {
        return getDays().contains(day);
    }

    public List<DayOfWeek> getDays() {
        return Arrays.stream(days.split(",")).filter(s -> !s.isBlank()).map(DayOfWeek::valueOf).sorted().toList();
    }

    public void setDays(Collection<DayOfWeek> days) {
        this.days = days == null || days.isEmpty()
                ? ALL_DAYS
                : days.stream().distinct().sorted().map(Enum::name).collect(Collectors.joining(","));
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public int getMinStaff() { return minStaff; }
    public void setMinStaff(int minStaff) { this.minStaff = minStaff; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
