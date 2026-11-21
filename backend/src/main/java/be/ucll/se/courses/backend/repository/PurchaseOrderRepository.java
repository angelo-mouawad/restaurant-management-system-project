package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.enums.PurchaseOrderStatus;
import be.ucll.se.courses.backend.model.PurchaseOrder;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    @EntityGraph(attributePaths = {"supplier", "createdBy"})
    List<PurchaseOrder> findAllByOrderByCreatedAtDesc();

    long countByStatusIn(Collection<PurchaseOrderStatus> statuses);

    long countBySupplierId(Long supplierId);
}
