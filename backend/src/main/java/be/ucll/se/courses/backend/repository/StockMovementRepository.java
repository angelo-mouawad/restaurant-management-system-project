package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.enums.MovementType;
import be.ucll.se.courses.backend.model.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    @EntityGraph(attributePaths = {"item", "user", "purchaseOrder"})
    @Query("""
            select m from StockMovement m
            where (:itemId is null or m.item.id = :itemId)
              and (:type is null or m.type = :type)
              and (cast(:from as timestamp) is null or m.createdAt >= :from)
            order by m.createdAt desc, m.id desc
            """)
    Page<StockMovement> search(@Param("itemId") Long itemId,
                               @Param("type") MovementType type,
                               @Param("from") LocalDateTime from,
                               Pageable pageable);
}
