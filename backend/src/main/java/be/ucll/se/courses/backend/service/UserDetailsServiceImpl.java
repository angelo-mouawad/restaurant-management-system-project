package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.model.UserDetailsImpl;
import be.ucll.se.courses.backend.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsPasswordService;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserDetailsServiceImpl implements UserDetailsService, UserDetailsPasswordService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .map(UserDetailsImpl::new)
                .orElseThrow(() -> new UsernameNotFoundException("No user found with username '" + username + "'"));
    }

    @Override
    public UserDetails updatePassword(UserDetails userDetails, String newPassword) {
        final var user = ((UserDetailsImpl) userDetails).user();
        user.setPassword(newPassword);
        userRepository.save(user);
        return new UserDetailsImpl(user);
    }
}
