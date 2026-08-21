package be.ucll.se.courses.backend.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Locale;

public enum Role {
    ADMIN,
    EMPLOYEE,
    GUEST;

    public GrantedAuthority toGrantedAuthority() {
        return new SimpleGrantedAuthority("ROLE_" + name());
    }

    @Override
    @JsonValue
    public String toString() {
        return super.toString().toLowerCase(Locale.ROOT);
    }
}
