package be.ucll.se.courses.backend.dtos;

import be.ucll.se.courses.backend.enums.Role;

public record AuthenticationResponse(
        String message,
        String token,
        String name,
        String username,
        Role role) {
}
