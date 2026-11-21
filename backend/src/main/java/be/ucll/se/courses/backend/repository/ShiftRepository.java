package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.enums.PeriodStatus;
import be.ucll.se.courses.backend.model.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ShiftRepository extends JpaRepository<Shift, Long> {

    @Query("""
            select s from Shift s join fetch s.user join fetch s.period left join fetch s.shiftType
            where s.date between :from and :to
            order by s.date, s.startTime
            """)
    List<Shift> findBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("""
            select s from Shift s join fetch s.period left join fetch s.shiftType
            where s.user.id = :userId and s.date between :from and :to
            order by s.date, s.startTime
            """)
    List<Shift> findForUserBetween(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    /** What an employee may see: only weeks that have been published. */
    @Query("""
            select s from Shift s join fetch s.period p left join fetch s.shiftType
            where s.user.id = :userId and s.date between :from and :to and p.status = :status
            order by s.date, s.startTime
            """)
    List<Shift> findForUserBetweenWithStatus(@Param("userId") Long userId, @Param("from") LocalDate from,
                                             @Param("to") LocalDate to, @Param("status") PeriodStatus status);

    @Query("select s from Shift s join fetch s.user where s.period.id = :periodId")
    List<Shift> findByPeriodId(@Param("periodId") Long periodId);

    long countByShiftTypeId(Long shiftTypeId);
}
