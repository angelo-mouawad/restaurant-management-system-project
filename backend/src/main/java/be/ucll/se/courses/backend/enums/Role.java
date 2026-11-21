package be.ucll.se.courses.backend.enums;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/**
 * ADMIN manages everyone below them and sees everything.
 * MANAGER runs the floor: employees, schedule, stock and orders.
 * EMPLOYEE submits availability and sees their own published schedule.
 */
public enum Role {
    ADMIN,
    MANAGER,
    EMPLOYEE;

    public GrantedAuthority toGrantedAuthority() {
        return new SimpleGrantedAuthority("ROLE_" + name());
    }

    public boolean isManagement() {
        return this == ADMIN || this == MANAGER;
    }
}
