package be.ucll.se.courses.backend.controller;

import be.ucll.se.courses.backend.config.CookieBearerTokenResolver;
import be.ucll.se.courses.backend.config.JwtProperties;
import be.ucll.se.courses.backend.dtos.UserDtos.LoginRequest;
import be.ucll.se.courses.backend.dtos.UserDtos.UserResponse;
import be.ucll.se.courses.backend.service.AuthService;
import be.ucll.se.courses.backend.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Map;

/** Signing in and out. The token lives in an httpOnly cookie, so scripts in the page can never read it. */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final JwtProperties jwtProperties;

    public AuthController(AuthService authService, UserService userService, JwtProperties jwtProperties) {
        this.authService = authService;
        this.userService = userService;
        this.jwtProperties = jwtProperties;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        final var signedIn = authService.login(request.username(), request.password());
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(signedIn.token(), jwtProperties.token().lifetime()).toString());
        return Map.of("message", "Signed in.", "username", signedIn.user().getUsername());
    }

    @PostMapping("/logout")
    public Map<String, String> logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString());
        return Map.of("message", "Signed out.");
    }

    /** The signed-in account. The frontend asks this on load instead of trusting anything stored in the browser. */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public UserResponse me() {
        return userService.me();
    }

    private static ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(CookieBearerTokenResolver.AUTH_COOKIE, value)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(maxAge)
                .sameSite("None")
                .build();
    }
}
