package be.ucll.se.courses.backend.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Day {
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY,
    SUNDAY;

    @JsonValue
    public String toDisplayName() {
        String name = name().toLowerCase();
        return Character.toUpperCase(name.charAt(0)) + name.substring(1);
    }
}
