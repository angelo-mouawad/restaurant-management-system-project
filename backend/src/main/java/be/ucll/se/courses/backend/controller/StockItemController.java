package be.ucll.se.courses.backend.controller;

import be.ucll.se.courses.backend.dtos.QuantityChangeRequest;
import be.ucll.se.courses.backend.dtos.StockItemRequest;
import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.service.StockItemService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/stockItem")
public class StockItemController {

    private final StockItemService stockItemService;

    @Autowired
    public StockItemController(StockItemService stockItemService) {
        this.stockItemService = stockItemService;
    }

    @GetMapping
    public List<StockItem> getStockItems() {
        return stockItemService.getStockItems();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public StockItem addStockItem(@Valid @RequestBody StockItemRequest stockItemRequest) {
        return stockItemService.addStockItem(stockItemRequest.name(), stockItemRequest.quantity());
    }

    @PostMapping("/{id}/increase")
    @PreAuthorize("hasRole('ADMIN')")
    public StockItem increaseStockItem(@PathVariable Long id, @Valid @RequestBody QuantityChangeRequest request) {
        return stockItemService.increaseQuantity(id, request.amount());
    }

    @PostMapping("/{id}/decrease")
    @PreAuthorize("hasRole('ADMIN')")
    public StockItem decreaseStockItem(@PathVariable Long id, @Valid @RequestBody QuantityChangeRequest request) {
        return stockItemService.decreaseQuantity(id, request.amount());
    }

    @DeleteMapping("/{id}/remove")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removeStockItem(@PathVariable Long id) {
        stockItemService.removeStockItem(id);
        return ResponseEntity.noContent().build();
    }
}
