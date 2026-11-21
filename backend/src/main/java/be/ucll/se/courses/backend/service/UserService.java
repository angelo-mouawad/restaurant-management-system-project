package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftResponse;
import be.ucll.se.courses.backend.dtos.UserDtos.ChangePasswordRequest;
import be.ucll.se.courses.backend.dtos.UserDtos.CreateUserRequest;
import be.ucll.se.courses.backend.dtos.UserDtos.ProfileResponse;
import be.ucll.se.courses.backend.dtos.UserDtos.UpdateProfileRequest;
import be.ucll.se.courses.backend.dtos.UserDtos.UpdateUserRequest;
import be.ucll.se.courses.backend.dtos.UserDtos.UserResponse;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.events.DomainEvents;
import be.ucll.se.courses.backend.exception.BusinessRuleException;
import be.ucll.se.courses.backend.exception.UserAlreadyExistsException;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * Accounts and profiles. The rules for who may do what to whom live here, on top of the role
 * checks on the controller: admins manage managers and employees, managers manage employees only,
 * and nobody manages their own account through these routes.
 */
@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;
    private final ScheduleService scheduleService;
    private final ApplicationEventPublisher events;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       CurrentUserService currentUserService,
                       ScheduleService scheduleService,
                       ApplicationEventPublisher events) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentUserService = currentUserService;
        this.scheduleService = scheduleService;
        this.events = events;
    }

    // ------------------------------------------------------------------ reading

    @Transactional(readOnly = true)
    public UserResponse me() {
        final User me = currentUserService.get();
        return toResponse(me, me);
    }

    /** The staff directory. Everyone may see it; what they see of each person depends on their role. */
    @Transactional(readOnly = true)
    public List<UserResponse> list(String search, Role role, Boolean active) {
        final User viewer = currentUserService.get();
        final String query = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return userRepository.findAllWithManager().stream()
                .filter(user -> role == null || user.getRole() == role)
                .filter(user -> active == null || user.isActive() == active)
                // Only management sees deactivated accounts.
                .filter(user -> viewer.isManagement() || user.isActive())
                .filter(user -> query.isEmpty()
                        || user.getName().toLowerCase(Locale.ROOT).contains(query)
                        || (user.getPosition() != null && user.getPosition().toLowerCase(Locale.ROOT).contains(query))
                        || (viewer.isManagement() && user.getUsername().toLowerCase(Locale.ROOT).contains(query)))
                .map(user -> toResponse(user, viewer))
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long id) {
        final User viewer = currentUserService.get();
        final User user = find(id);
        if (!user.isActive() && !viewer.isManagement()) {
            throw new EntityNotFoundException("User not found.");
        }
        return toResponse(user, viewer);
    }

    @Transactional(readOnly = true)
    public ProfileResponse profile(Long id) {
        final User viewer = currentUserService.get();
        final User user = find(id);
        if (!user.isActive() && !viewer.isManagement()) {
            throw new EntityNotFoundException("User not found.");
        }
        final boolean self = viewer.getId().equals(user.getId());
        final boolean seesSchedule = self || viewer.isManagement();

        List<ShiftResponse> upcoming = null;
        Double hours = null;
        if (seesSchedule && user.getRole() == Role.EMPLOYEE) {
            // An employee only ever sees published weeks, even on their own profile.
            final boolean publishedOnly = !viewer.isManagement();
            upcoming = scheduleService.upcoming(user, publishedOnly, 21);
            hours = scheduleService.hoursThisWeek(user, publishedOnly);
        }
        final List<UserResponse> team = user.getRole() == Role.EMPLOYEE ? List.of()
                : userRepository.findByManagerIdOrderByName(user.getId()).stream()
                .filter(member -> member.isActive() || viewer.isManagement())
                .map(member -> toResponse(member, viewer)).toList();
        return new ProfileResponse(toResponse(user, viewer), upcoming, hours, team, self);
    }

    /** Managers and admins, for picking who someone reports to. */
    @Transactional(readOnly = true)
    public List<UserResponse> managers() {
        final User viewer = currentUserService.get();
        return userRepository.findByRoleInAndActiveTrueOrderByName(List.of(Role.MANAGER, Role.ADMIN)).stream()
                .map(user -> toResponse(user, viewer)).toList();
    }

    // ------------------------------------------------------------------ managing others

    public UserResponse create(CreateUserRequest request) {
        final User actor = currentUserService.get();
        requireCanAssignRole(actor, request.role());
        final String username = request.username().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByUsername(username)) {
            throw new UserAlreadyExistsException("The username " + username + " is already taken.");
        }
        final String email = blankToNull(request.email());
        if (email != null && userRepository.existsByEmailIgnoreCase(email)) {
            throw new UserAlreadyExistsException("Another account already uses " + email + ".");
        }

        final User user = new User(request.name().trim(), username, passwordEncoder.encode(request.password()), request.role());
        user.setEmail(email);
        user.setPhone(blankToNull(request.phone()));
        user.setPosition(blankToNull(request.position()));
        user.setMaxWeeklyHours(request.maxWeeklyHours() == null ? 38 : request.maxWeeklyHours());
        user.setManager(resolveManager(request.managerId(), request.role(), actor));
        userRepository.save(user);

        events.publishEvent(new DomainEvents.AccountCreated(user, actor));
        return toResponse(user, actor);
    }

    public UserResponse update(Long id, UpdateUserRequest request) {
        final User actor = currentUserService.get();
        final User user = find(id);
        requireCanManage(actor, user);
        requireCanAssignRole(actor, request.role());

        final String email = blankToNull(request.email());
        if (email != null && userRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new UserAlreadyExistsException("Another account already uses " + email + ".");
        }
        final Role previousRole = user.getRole();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPhone(blankToNull(request.phone()));
        user.setPosition(blankToNull(request.position()));
        if (request.maxWeeklyHours() != null) {
            user.setMaxWeeklyHours(request.maxWeeklyHours());
        }
        user.setRole(request.role());
        user.setManager(resolveManager(request.managerId(), request.role(), actor));
        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }

        if (previousRole != request.role()) {
            if (previousRole == Role.EMPLOYEE) {
                // Only employees are scheduled, so a promotion clears their upcoming shifts.
                scheduleService.removeFutureShifts(user, actor);
            }
            if (previousRole.isManagement() && !request.role().isManagement()) {
                userRepository.findByManagerIdOrderByName(user.getId()).forEach(member -> member.setManager(null));
            }
            events.publishEvent(new DomainEvents.RoleChanged(user, previousRole, request.role(), actor));
        }
        return toResponse(user, actor);
    }

    public UserResponse setActive(Long id, boolean active) {
        final User actor = currentUserService.get();
        final User user = find(id);
        requireCanManage(actor, user);
        if (user.isActive() == active) {
            return toResponse(user, actor);
        }
        user.setActive(active);
        if (!active) {
            scheduleService.removeFutureShifts(user, actor);
        }
        return toResponse(user, actor);
    }

    /** Removes the account for good. Their history (stock movements, orders) stays, without a name attached. */
    public void delete(Long id) {
        final User actor = currentUserService.get();
        final User user = find(id);
        requireCanManage(actor, user);
        userRepository.findByManagerIdOrderByName(user.getId()).forEach(member -> member.setManager(null));
        userRepository.delete(user);
    }

    // ------------------------------------------------------------------ own account

    public UserResponse updateMine(UpdateProfileRequest request) {
        final User me = currentUserService.get();
        final String email = blankToNull(request.email());
        if (email != null && userRepository.existsByEmailIgnoreCaseAndIdNot(email, me.getId())) {
            throw new UserAlreadyExistsException("Another account already uses " + email + ".");
        }
        me.setName(request.name().trim());
        me.setEmail(email);
        me.setPhone(blankToNull(request.phone()));
        userRepository.save(me);
        return toResponse(me, me);
    }

    public void changeMyPassword(ChangePasswordRequest request) {
        final User me = currentUserService.get();
        if (!passwordEncoder.matches(request.currentPassword(), me.getPassword())) {
            throw new IllegalArgumentException("Your current password is not correct.");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new IllegalArgumentException("Pick a new password that differs from the current one.");
        }
        me.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(me);
    }

    // ------------------------------------------------------------------ rules

    static boolean canManage(User actor, User target) {
        if (actor.getId().equals(target.getId())) {
            return false;
        }
        return switch (actor.getRole()) {
            case ADMIN -> target.getRole() != Role.ADMIN;
            case MANAGER -> target.getRole() == Role.EMPLOYEE;
            case EMPLOYEE -> false;
        };
    }

    private static void requireCanManage(User actor, User target) {
        if (actor.getId().equals(target.getId())) {
            throw new BusinessRuleException("OWN_ACCOUNT", "Use your profile page to change your own account.");
        }
        if (!canManage(actor, target)) {
            throw new AccessDeniedException(actor.getRole() == Role.MANAGER
                    ? "Managers can only manage employees."
                    : "You are not allowed to manage this account.");
        }
    }

    private static void requireCanAssignRole(User actor, Role role) {
        final boolean allowed = switch (actor.getRole()) {
            case ADMIN -> role == Role.MANAGER || role == Role.EMPLOYEE;
            case MANAGER -> role == Role.EMPLOYEE;
            case EMPLOYEE -> false;
        };
        if (!allowed) {
            throw new AccessDeniedException(actor.getRole() == Role.MANAGER
                    ? "Managers can only create and edit employees."
                    : "Admins can create managers and employees.");
        }
    }

    /** Employees report to a manager; when a manager creates one without picking, it is them. */
    private User resolveManager(Long managerId, Role role, User actor) {
        if (role != Role.EMPLOYEE) {
            return null;
        }
        if (managerId == null) {
            return actor.getRole() == Role.MANAGER ? actor : null;
        }
        final User manager = find(managerId);
        if (!manager.isManagement() || !manager.isActive()) {
            throw new IllegalArgumentException("An employee can only report to an active manager or admin.");
        }
        return manager;
    }

    private User find(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("User not found."));
    }

    UserResponse toResponse(User user, User viewer) {
        final boolean self = viewer.getId().equals(user.getId());
        final boolean contact = self || viewer.isManagement();
        final User manager = user.getManager();
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getRole(),
                user.getPosition(),
                user.isActive(),
                user.getJoinedAt(),
                manager == null ? null : manager.getId(),
                manager == null ? null : manager.getName(),
                contact ? user.getUsername() : null,
                contact ? user.getEmail() : null,
                contact ? user.getPhone() : null,
                contact ? user.getMaxWeeklyHours() : null,
                contact,
                canManage(viewer, user));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
