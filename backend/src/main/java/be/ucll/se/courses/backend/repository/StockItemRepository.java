package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.model.StockItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StockItemRepository extends JpaRepository<StockItem, Long> {

    @Query("select i from StockItem i left join fetch i.supplier where (:archived = true or i.archived = false) order by i.name")
    List<StockItem> findAllWithSupplier(@Param("archived") boolean includeArchived);

    /** Locks the row so two movements on the same item cannot both read the old quantity. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from StockItem i where i.id = :id")
    Optional<StockItem> findByIdForUpdate(@Param("id") Long id);

    boolean existsByNameIgnoreCaseAndArchivedFalse(String name);

    boolean existsByNameIgnoreCaseAndArchivedFalseAndIdNot(String name, Long id);

    long countBySupplierId(Long supplierId);
}
