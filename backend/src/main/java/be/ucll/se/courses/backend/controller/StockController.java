package be.ucll.se.courses.backend.controller;

import be.ucll.se.courses.backend.dtos.PageResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.MovementRequest;
import be.ucll.se.courses.backend.dtos.StockDtos.MovementResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.PurchaseOrderRequest;
import be.ucll.se.courses.backend.dtos.StockDtos.PurchaseOrderResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.StockItemDetailResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.StockItemRequest;
import be.ucll.se.courses.backend.dtos.StockDtos.StockItemResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.StockOverviewResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.SupplierRequest;
import be.ucll.se.courses.backend.dtos.StockDtos.SupplierResponse;
import be.ucll.se.courses.backend.enums.MovementType;
import be.ucll.se.courses.backend.service.PurchaseOrderService;
import be.ucll.se.courses.backend.service.StockService;
import be.ucll.se.courses.backend.service.SupplierService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Stock, suppliers and purchase orders. Management only: employees have no access to stock. */
@RestController
@RequestMapping("/stock")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class StockController {

    private final StockService stockService;
    private final SupplierService supplierService;
    private final PurchaseOrderService orderService;

    public StockController(StockService stockService, SupplierService supplierService, PurchaseOrderService orderService) {
        this.stockService = stockService;
        this.supplierService = supplierService;
        this.orderService = orderService;
    }

    // ------------------------------------------------------------------ overview and items

    @GetMapping("/overview")
    public StockOverviewResponse overview() {
        return stockService.overview();
    }

    @GetMapping("/items")
    public List<StockItemResponse> items(@RequestParam(defaultValue = "false") boolean includeArchived) {
        return stockService.list(includeArchived);
    }

    @GetMapping("/items/{id}")
    public StockItemDetailResponse item(@PathVariable Long id) {
        return stockService.detail(id);
    }

    @PostMapping("/items")
    public ResponseEntity<StockItemResponse> createItem(@Valid @RequestBody StockItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stockService.create(request));
    }

    @PutMapping("/items/{id}")
    public StockItemResponse updateItem(@PathVariable Long id, @Valid @RequestBody StockItemRequest request) {
        return stockService.update(id, request);
    }

    @PostMapping("/items/{id}/archive")
    public StockItemResponse archive(@PathVariable Long id) {
        return stockService.setArchived(id, true);
    }

    @PostMapping("/items/{id}/restore")
    public StockItemResponse restore(@PathVariable Long id) {
        return stockService.setArchived(id, false);
    }

    // ------------------------------------------------------------------ movements

    @PostMapping("/items/{id}/movements")
    public ResponseEntity<MovementResponse> recordMovement(@PathVariable Long id, @Valid @RequestBody MovementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stockService.recordMovement(id, request));
    }

    @GetMapping("/movements")
    public PageResponse<MovementResponse> movements(@RequestParam(required = false) Long itemId,
                                                    @RequestParam(required = false) MovementType type,
                                                    @RequestParam(required = false) Integer days,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "25") int size) {
        return stockService.movements(itemId, type, days, page, size);
    }

    // ------------------------------------------------------------------ suppliers

    @GetMapping("/suppliers")
    public List<SupplierResponse> suppliers() {
        return supplierService.list();
    }

    @PostMapping("/suppliers")
    public ResponseEntity<SupplierResponse> createSupplier(@Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierService.create(request));
    }

    @PutMapping("/suppliers/{id}")
    public SupplierResponse updateSupplier(@PathVariable Long id, @Valid @RequestBody SupplierRequest request) {
        return supplierService.update(id, request);
    }

    @DeleteMapping("/suppliers/{id}")
    public ResponseEntity<Void> deleteSupplier(@PathVariable Long id) {
        supplierService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------------ purchase orders

    @GetMapping("/orders")
    public List<PurchaseOrderResponse> orders() {
        return orderService.list();
    }

    @GetMapping("/orders/{id}")
    public PurchaseOrderResponse order(@PathVariable Long id) {
        return orderService.get(id);
    }

    @PostMapping("/orders")
    public ResponseEntity<PurchaseOrderResponse> createOrder(@Valid @RequestBody PurchaseOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.create(request));
    }

    @PutMapping("/orders/{id}")
    public PurchaseOrderResponse updateOrder(@PathVariable Long id, @Valid @RequestBody PurchaseOrderRequest request) {
        return orderService.update(id, request);
    }

    @PostMapping("/orders/{id}/order")
    public PurchaseOrderResponse markOrdered(@PathVariable Long id) {
        return orderService.markOrdered(id);
    }

    @PostMapping("/orders/{id}/receive")
    public PurchaseOrderResponse receive(@PathVariable Long id) {
        return orderService.receive(id);
    }

    @PostMapping("/orders/{id}/cancel")
    public PurchaseOrderResponse cancel(@PathVariable Long id) {
        return orderService.cancel(id);
    }

    @DeleteMapping("/orders/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        orderService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
