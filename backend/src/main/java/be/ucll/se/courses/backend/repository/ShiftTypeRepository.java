package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.model.ShiftType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShiftTypeRepository extends JpaRepository<ShiftType, Long> {

    List<ShiftType> findAllByOrderByStartTime();

    List<ShiftType> findByActiveTrueOrderByStartTime();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
