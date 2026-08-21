package be.ucll.se.courses.backend.dtos;

import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.model.User;

public record UserResponse(
        Long id,
        String name,
        String username,
        Role role) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getUsername(), user.getRole());
    }
}
