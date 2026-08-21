package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.config.JwtProperties;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtServiceTest {

    @Mock
    private JwtEncoder jwtEncoder;

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        var properties = new JwtProperties("secret", new JwtProperties.Token("issuer", Duration.ofHours(1)));
        jwtService = new JwtService(properties, jwtEncoder);
    }

    @Test
    void generateToken_returnsEncodedTokenValue() {
        when(jwtEncoder.encode(any(JwtEncoderParameters.class))).thenReturn(jwt("token-value"));

        var token = jwtService.generateToken("jane", Role.ADMIN);

        assertThat(token).isEqualTo("token-value");
    }

    @Test
    void generateToken_fromUserDelegatesToPrimaryMethod() {
        var user = new User("Jane", "jane", "pw", Role.EMPLOYEE);
        when(jwtEncoder.encode(any(JwtEncoderParameters.class))).thenReturn(jwt("user-token"));

        var token = jwtService.generateToken(user);

        assertThat(token).isEqualTo("user-token");
    }

    @Test
    void generateToken_withNullUser_throwsIllegalArgument() {
        assertThatThrownBy(() -> jwtService.generateToken((User) null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void generateToken_withBlankUsername_throwsIllegalArgument() {
        assertThatThrownBy(() -> jwtService.generateToken("  ", Role.ADMIN))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private Jwt jwt(String value) {
        return new Jwt(
                value,
                Instant.now(),
                Instant.now().plusSeconds(60),
                Map.of("alg", "HS256"),
                Map.of("sub", "jane"));
    }
}
