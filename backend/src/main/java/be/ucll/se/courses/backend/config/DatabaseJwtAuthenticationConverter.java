package be.ucll.se.courses.backend.config;

import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.UserRepository;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Turns a valid token into an authentication using the account as it is now, not as it was when the
 * token was issued. A deactivated user is rejected straight away, and a role change applies on the
 * next request instead of when the token expires.
 */
@Component
public class DatabaseJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;

    public DatabaseJwtAuthenticationConverter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AbstractAuthenticationToken convert(Jwt jwt) {
        final User user = userRepository.findByUsername(jwt.getSubject())
                .orElseThrow(() -> new InvalidBearerTokenException("The account behind this session no longer exists."));
        if (!user.isActive()) {
            throw new DisabledException("This account has been deactivated.");
        }
        return new JwtAuthenticationToken(jwt, List.of(user.getRole().toGrantedAuthority()), user.getUsername());
    }
}
