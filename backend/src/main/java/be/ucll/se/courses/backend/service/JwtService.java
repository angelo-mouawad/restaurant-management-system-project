package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.config.JwtProperties;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.model.User;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class JwtService {

    private final JwtProperties jwtProperties;
    private final JwtEncoder jwtEncoder;

    public JwtService(JwtProperties jwtProperties, JwtEncoder jwtEncoder) {
        this.jwtProperties = jwtProperties;
        this.jwtEncoder = jwtEncoder;
    }

    public String generateToken(String username, Role role) {
        if (username == null || username.isBlank() || role == null) {
            throw new IllegalArgumentException("Username and role are required to generate a token");
        }
        final Instant now = Instant.now();
        final var header = JwsHeader.with(MacAlgorithm.HS256).build();
        final var claims = JwtClaimsSet.builder()
                .issuer(jwtProperties.token().issuer())
                .issuedAt(now)
                .expiresAt(now.plus(jwtProperties.token().lifetime()))
                .subject(username)
                .claim("scope", role.toGrantedAuthority().getAuthority())
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public String generateToken(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User is required to generate a token");
        }
        return generateToken(user.getUsername(), user.getRole());
    }
}
