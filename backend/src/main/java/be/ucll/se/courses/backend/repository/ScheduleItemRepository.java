package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.model.ScheduleItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleItemRepository extends JpaRepository<ScheduleItem,Long> {}
