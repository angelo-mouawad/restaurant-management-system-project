package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.model.Availability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AvailabilityRepository extends JpaRepository<Availability, Long> {

    List<Availability> findByUserIdAndDateBetweenOrderByDate(Long userId, LocalDate from, LocalDate to);

    Optional<Availability> findByUserIdAndDate(Long userId, LocalDate date);

    @Query("select a from Availability a join fetch a.user u where u.active = true and a.date between :from and :to")
    List<Availability> findForActiveUsersBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
