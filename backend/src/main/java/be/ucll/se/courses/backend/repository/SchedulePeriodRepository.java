package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.model.SchedulePeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SchedulePeriodRepository extends JpaRepository<SchedulePeriod, Long> {

    Optional<SchedulePeriod> findByWeekStart(LocalDate weekStart);

    List<SchedulePeriod> findByWeekStartBetweenOrderByWeekStart(LocalDate from, LocalDate to);
}
