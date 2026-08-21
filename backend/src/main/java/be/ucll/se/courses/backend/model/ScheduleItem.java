package be.ucll.se.courses.backend.model;

import be.ucll.se.courses.backend.enums.Day;
import be.ucll.se.courses.backend.enums.Shift;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotNull;

@Entity
public class ScheduleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Day day;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Shift shift;

    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"schedule", "notifications", "password"})
    private User user;

    protected ScheduleItem() {}

    public ScheduleItem(Day day, Shift shift, User user) {
        this.day = day;
        this.shift = shift;
        this.user = user;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Day getDay() {
        return day;
    }

    public void setDay(Day day) {
        this.day = day;
    }

    public Shift getShift() {
        return shift;
    }

    public void setShift(Shift shift) {
        this.shift = shift;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
