package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.model.ShiftChange;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShiftChangeRepository extends JpaRepository<ShiftChange, Long> {

    @EntityGraph(attributePaths = {"affectedUser", "changedBy"})
    List<ShiftChange> findByPeriodIdOrderByChangedAtDesc(Long periodId);
}
