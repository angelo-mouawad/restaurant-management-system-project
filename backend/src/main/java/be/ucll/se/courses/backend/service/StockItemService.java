package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.repository.StockItemRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class StockItemService {

    private final StockItemRepository stockItemRepository;

    @Autowired
    public StockItemService(StockItemRepository stockItemRepository) {
        this.stockItemRepository = stockItemRepository;
    }

    @Transactional(readOnly = true)
    public List<StockItem> getStockItems() {
        return stockItemRepository.findAll();
    }

    public StockItem addStockItem(String name, int quantity) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        if (quantity < 0) {
            throw new IllegalArgumentException("Quantity may not be negative");
        }
        return stockItemRepository.save(new StockItem(name.trim(), quantity));
    }

    public StockItem increaseQuantity(Long id, Integer amount) {
        final int delta = requirePositiveAmount(amount);
        final StockItem stockItem = findById(id);
        final long newQuantity = (long) stockItem.getQuantity() + delta;
        if (newQuantity > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Resulting quantity is too large");
        }
        stockItem.setQuantity((int) newQuantity);
        return stockItemRepository.save(stockItem);
    }

    public StockItem decreaseQuantity(Long id, Integer amount) {
        final int delta = requirePositiveAmount(amount);
        final StockItem stockItem = findById(id);
        final int newQuantity = stockItem.getQuantity() - delta;
        if (newQuantity < 0) {
            throw new IllegalArgumentException("Resulting quantity may not be negative");
        }
        stockItem.setQuantity(newQuantity);
        return stockItemRepository.save(stockItem);
    }

    public void removeStockItem(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Stock item id is required");
        }
        if (!stockItemRepository.existsById(id)) {
            throw new EntityNotFoundException("Stock item with id " + id + " not found");
        }
        stockItemRepository.deleteById(id);
    }

    private StockItem findById(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Stock item id is required");
        }
        return stockItemRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Stock item with id " + id + " not found"));
    }

    private int requirePositiveAmount(Integer amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Amount is required");
        }
        if (amount < 1) {
            throw new IllegalArgumentException("Amount must be at least 1");
        }
        return amount;
    }
}
