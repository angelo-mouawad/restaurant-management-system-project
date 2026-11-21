package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.model.UserDetailsImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

/** Checks a username and password and hands back a signed token for the account. */
@Service
public class AuthService {

    public record SignedIn(User user, String token) {}

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public SignedIn login(String username, String password) {
        final var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username.trim().toLowerCase(), password));
        final User user = ((UserDetailsImpl) authentication.getPrincipal()).user();
        return new SignedIn(user, jwtService.generateToken(user));
    }
}
