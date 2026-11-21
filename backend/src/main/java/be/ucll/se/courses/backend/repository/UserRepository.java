package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByUsername(String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    Optional<User> findByUsername(String username);

    List<User> findByRoleInAndActiveTrueOrderByName(Collection<Role> roles);

    List<User> findByManagerIdOrderByName(Long managerId);

    @Query("select u from User u where u.role = be.ucll.se.courses.backend.enums.Role.EMPLOYEE and u.active = true order by u.name")
    List<User> findActiveEmployees();

    @Query("select u from User u left join fetch u.manager order by u.active desc, u.name")
    List<User> findAllWithManager();
}
