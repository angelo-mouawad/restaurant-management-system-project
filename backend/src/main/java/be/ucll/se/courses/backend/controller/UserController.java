package be.ucll.se.courses.backend.controller;

import be.ucll.se.courses.backend.dtos.AuthenticationRequest;
import be.ucll.se.courses.backend.dtos.AuthenticationResponse;
import be.ucll.se.courses.backend.dtos.UserInput;
import be.ucll.se.courses.backend.dtos.UserResponse;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
public class UserController {

    private static final String AUTH_COOKIE = "authToken";

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/signup")
    public UserResponse signup(@Valid @RequestBody UserInput userInput) {
        return UserResponse.from(userService.signup(Role.GUEST, userInput));
    }

    @GetMapping({"", "/"})
    public List<UserResponse> getAllUsers() {
        return userService.getAllUsers().stream().map(UserResponse::from).toList();
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> authenticate(
            @Valid @RequestBody AuthenticationRequest authenticationRequest,
            HttpServletResponse response) {
        final var auth = userService.authenticate(authenticationRequest.username(), authenticationRequest.password());
        response.addHeader(HttpHeaders.SET_COOKIE, buildAuthCookie(auth.token(), Duration.ofHours(1)).toString());
        return ResponseEntity.ok(new AuthenticationResponse(
                auth.message(), null, auth.name(), auth.username(), auth.role()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildAuthCookie("", Duration.ZERO).toString());
        return ResponseEntity.ok(Map.of("message", "Logout successful"));
    }

    @GetMapping("/{id}")
    public UserResponse getUserById(@PathVariable Long id) {
        return UserResponse.from(userService.getUserById(id));
    }

    private ResponseCookie buildAuthCookie(String value, Duration maxAge) {
        return ResponseCookie.from(AUTH_COOKIE, value)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(maxAge)
                .sameSite("None")
                .build();
    }
}
