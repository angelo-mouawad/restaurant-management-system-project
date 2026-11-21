package be.ucll.se.courses.backend.controller;

import be.ucll.se.courses.backend.dtos.UserDtos.ChangePasswordRequest;
import be.ucll.se.courses.backend.dtos.UserDtos.CreateUserRequest;
import be.ucll.se.courses.backend.dtos.UserDtos.ProfileResponse;
import be.ucll.se.courses.backend.dtos.UserDtos.SetActiveRequest;
import be.ucll.se.courses.backend.dtos.UserDtos.UpdateProfileRequest;
import be.ucll.se.courses.backend.dtos.UserDtos.UpdateUserRequest;
import be.ucll.se.courses.backend.dtos.UserDtos.UserResponse;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /** Staff directory. Contact details are only filled in for managers and admins. */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<UserResponse> list(@RequestParam(required = false) String search,
                                   @RequestParam(required = false) Role role,
                                   @RequestParam(required = false) Boolean active) {
        return userService.list(search, role, active);
    }

    @GetMapping("/managers")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public List<UserResponse> managers() {
        return userService.managers();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public UserResponse get(@PathVariable Long id) {
        return userService.get(id);
    }

    @GetMapping("/{id}/profile")
    @PreAuthorize("isAuthenticated()")
    public ProfileResponse profile(@PathVariable Long id) {
        return userService.profile(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        return userService.update(id, request);
    }

    @PatchMapping("/{id}/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public UserResponse setActive(@PathVariable Long id, @Valid @RequestBody SetActiveRequest request) {
        return userService.setActive(id, request.active());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public UserResponse updateMine(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateMine(request);
    }

    @PutMapping("/me/password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> changeMyPassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changeMyPassword(request);
        return ResponseEntity.noContent().build();
    }
}
