package be.ucll.se.courses.backend.dtos;

import be.ucll.se.courses.backend.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/** Requests and responses for accounts and profiles. */
public final class UserDtos {

    private UserDtos() {}

    public record LoginRequest(
            @NotBlank(message = "Username is required") String username,
            @NotBlank(message = "Password is required") String password) {
    }

    /**
     * A user as the viewer is allowed to see them. Contact details and account settings are null
     * unless the viewer is a manager, an admin, or the user themselves.
     */
    public record UserResponse(
            Long id,
            String name,
            Role role,
            String position,
            boolean active,
            LocalDate joinedAt,
            Long managerId,
            String managerName,
            String username,
            String email,
            String phone,
            Integer maxWeeklyHours,
            boolean contactVisible,
            boolean canManage) {
    }

    public record CreateUserRequest(
            @NotBlank(message = "Name is required") @Size(max = 255, message = "Name may not exceed 255 characters") String name,
            @NotBlank(message = "Username is required")
            @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
            @Pattern(regexp = "[a-zA-Z0-9._-]+", message = "Username may only contain letters, numbers, dots, dashes and underscores")
            String username,
            @NotBlank(message = "Password is required") @Size(min = 8, max = 100, message = "Password must be at least 8 characters") String password,
            @Email(message = "Enter a valid email address") @Size(max = 255) String email,
            @Size(max = 50, message = "Phone number may not exceed 50 characters") String phone,
            @NotNull(message = "Role is required") Role role,
            @Size(max = 100, message = "Position may not exceed 100 characters") String position,
            @Min(value = 1, message = "Weekly hours must be at least 1") @Max(value = 80, message = "Weekly hours may not exceed 80") Integer maxWeeklyHours,
            Long managerId) {
    }

    public record UpdateUserRequest(
            @NotBlank(message = "Name is required") @Size(max = 255, message = "Name may not exceed 255 characters") String name,
            @Email(message = "Enter a valid email address") @Size(max = 255) String email,
            @Size(max = 50, message = "Phone number may not exceed 50 characters") String phone,
            @NotNull(message = "Role is required") Role role,
            @Size(max = 100, message = "Position may not exceed 100 characters") String position,
            @Min(value = 1, message = "Weekly hours must be at least 1") @Max(value = 80, message = "Weekly hours may not exceed 80") Integer maxWeeklyHours,
            Long managerId,
            /** Optional: sets a new password for the user. */
            @Size(min = 8, max = 100, message = "Password must be at least 8 characters") String password) {
    }

    public record UpdateProfileRequest(
            @NotBlank(message = "Name is required") @Size(max = 255, message = "Name may not exceed 255 characters") String name,
            @Email(message = "Enter a valid email address") @Size(max = 255) String email,
            @Size(max = 50, message = "Phone number may not exceed 50 characters") String phone) {
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Enter your current password") String currentPassword,
            @NotBlank(message = "Enter a new password") @Size(min = 8, max = 100, message = "The new password must be at least 8 characters") String newPassword) {
    }

    public record SetActiveRequest(@NotNull(message = "Active is required") Boolean active) {
    }

    public record ProfileResponse(
            UserResponse user,
            /** Only for the user themselves and management. */
            List<ScheduleDtos.ShiftResponse> upcomingShifts,
            Double hoursThisWeek,
            /** The employees reporting to this user, when they are a manager. */
            List<UserResponse> team,
            boolean self) {
    }
}
