package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.AuthenticationResponse;
import be.ucll.se.courses.backend.dtos.UserInput;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.exception.UserAlreadyExistsException;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.model.UserDetailsImpl;
import be.ucll.se.courses.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private UserService userService;

    @Test
    void signup_encodesPasswordAndSavesUser() {
        var userInput = new UserInput("Jane", "jane", "password");
        when(userRepository.existsByUsername("jane")).thenReturn(false);
        when(passwordEncoder.encode("password")).thenReturn("hashed");

        var savedUser = new User("Jane", "jane", "hashed", Role.GUEST);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        var result = userService.signup(Role.GUEST, userInput);

        assertThat(result).isEqualTo(savedUser);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void signup_withExistingUsername_throwsUserAlreadyExists() {
        var userInput = new UserInput("Jane", "jane", "password");
        when(userRepository.existsByUsername("jane")).thenReturn(true);

        assertThatThrownBy(() -> userService.signup(Role.GUEST, userInput))
                .isInstanceOf(UserAlreadyExistsException.class);
    }

    @Test
    void authenticate_returnsAuthenticationResponseWithToken() {
        var user = new User("Jane", "jane", "password", Role.ADMIN);
        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(new UserDetailsImpl(user));
        when(jwtService.generateToken(user)).thenReturn("signed-token");

        AuthenticationResponse response = userService.authenticate("jane", "password");

        assertThat(response.token()).isEqualTo("signed-token");
        assertThat(response.username()).isEqualTo("jane");
        assertThat(response.role()).isEqualTo(Role.ADMIN);
    }

    @Test
    void authenticate_withBlankCredentials_throwsIllegalArgument() {
        assertThatThrownBy(() -> userService.authenticate("", "password"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void getUserById_withUnknownId_throwsEntityNotFound() {
        when(userRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserById(404L))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
