package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.AuthenticationResponse;
import be.ucll.se.courses.backend.dtos.UserInput;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.exception.UserAlreadyExistsException;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.model.UserDetailsImpl;
import be.ucll.se.courses.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Autowired
    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public User signup(Role role, UserInput userInput) {
        if (userInput == null) {
            throw new IllegalArgumentException("User details are required");
        }
        if (userRepository.existsByUsername(userInput.username())) {
            throw new UserAlreadyExistsException(userInput.username());
        }
        final String hashedPassword = passwordEncoder.encode(userInput.password());
        return userRepository.save(new User(userInput.name(), userInput.username(), hashedPassword, role));
    }

    public AuthenticationResponse authenticate(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Username and password are required");
        }
        final var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password));
        final User user = ((UserDetailsImpl) authentication.getPrincipal()).user();
        return new AuthenticationResponse(
                "Authentication successful.",
                jwtService.generateToken(user),
                user.getName(),
                user.getUsername(),
                user.getRole());
    }

    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional(readOnly = true)
    public User getUserById(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("User id is required");
        }
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User with id " + id + " not found"));
    }
}
