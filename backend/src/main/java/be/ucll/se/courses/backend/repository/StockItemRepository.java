package be.ucll.se.courses.backend.repository;

import be.ucll.se.courses.backend.model.StockItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockItemRepository extends JpaRepository<StockItem, Long> {}
