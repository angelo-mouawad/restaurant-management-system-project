package be.ucll.se.courses.backend.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Shift {
    MORNING,
    EVENING;

    @JsonValue
    public String toDisplayName() {
        String name = name().toLowerCase();
        return Character.toUpperCase(name.charAt(0)) + name.substring(1);
    }
}
