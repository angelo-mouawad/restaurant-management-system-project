package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.model.UserDetailsImpl;
import be.ucll.se.courses.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserDetailsServiceImpl userDetailsService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User("Jane", "jane", "pw", Role.ADMIN);
    }

    @Test
    void loadUserByUsername_returnsWrappedUser() {
        when(userRepository.findByUsername("jane")).thenReturn(Optional.of(user));

        UserDetails userDetails = userDetailsService.loadUserByUsername("jane");

        assertThat(userDetails.getUsername()).isEqualTo("jane");
        assertThat(userDetails.getPassword()).isEqualTo("pw");
    }

    @Test
    void updatePassword_setsNewPasswordOnUser() {
        var userDetails = new UserDetailsImpl(user);

        var updated = userDetailsService.updatePassword(userDetails, "new-password");

        assertThat(((UserDetailsImpl) updated).user().getPassword()).isEqualTo("new-password");
    }
}
