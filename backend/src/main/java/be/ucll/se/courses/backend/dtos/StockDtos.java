package be.ucll.se.courses.backend.dtos;

import be.ucll.se.courses.backend.enums.MovementType;
import be.ucll.se.courses.backend.enums.PurchaseOrderStatus;
import be.ucll.se.courses.backend.enums.StockCategory;
import be.ucll.se.courses.backend.enums.StockUnit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Requests and responses for stock items, movements, suppliers and purchase orders. */
public final class StockDtos {

    private StockDtos() {}

    // ------------------------------------------------------------------ items

    public record StockItemRequest(
            @NotBlank(message = "Name is required") @Size(max = 255, message = "Name may not exceed 255 characters") String name,
            @NotNull(message = "Category is required") StockCategory category,
            @NotNull(message = "Unit is required") StockUnit unit,
            @NotNull(message = "Minimum threshold is required") @DecimalMin(value = "0", message = "The threshold may not be negative")
            @DecimalMax(value = "999999", message = "The threshold is too large") BigDecimal minThreshold,
            @NotNull(message = "Cost per unit is required") @DecimalMin(value = "0", message = "Cost may not be negative")
            @DecimalMax(value = "999999", message = "The cost is too large") BigDecimal costPerUnit,
            Long supplierId,
            /** Only used when creating: becomes the opening balance movement. */
            @DecimalMin(value = "0", message = "The opening quantity may not be negative")
            @DecimalMax(value = "999999", message = "The opening quantity is too large") BigDecimal initialQuantity) {
    }

    public record StockItemResponse(Long id, String name, StockCategory category, StockUnit unit, BigDecimal quantity,
                                    BigDecimal minThreshold, BigDecimal costPerUnit, BigDecimal stockValue,
                                    boolean low, boolean archived, Long supplierId, String supplierName) {
    }

    /**
     * DELIVERY, USAGE and WASTE take a positive quantity to add or remove.
     * CORRECTION takes the quantity that was actually counted.
     */
    public record MovementRequest(
            @NotNull(message = "Pick a movement type") MovementType type,
            @NotNull(message = "Quantity is required") @DecimalMin(value = "0", message = "Quantity may not be negative")
            @DecimalMax(value = "999999", message = "The quantity is too large") BigDecimal quantity,
            @Size(max = 500, message = "The reason may not exceed 500 characters") String reason) {
    }

    public record MovementResponse(Long id, Long itemId, String itemName, StockUnit unit, MovementType type,
                                   BigDecimal quantityChange, BigDecimal quantityAfter, String reason,
                                   String userName, Long purchaseOrderId, LocalDateTime createdAt) {
    }

    public record StockItemDetailResponse(StockItemResponse item, List<MovementResponse> recentMovements) {
    }

    public record StockOverviewResponse(BigDecimal totalValue, int itemCount, int lowStockCount, long openOrderCount,
                                        List<StockItemResponse> lowStockItems, List<MovementResponse> recentMovements) {
    }

    // ------------------------------------------------------------------ suppliers

    public record SupplierRequest(
            @NotBlank(message = "Name is required") @Size(max = 255, message = "Name may not exceed 255 characters") String name,
            @Size(max = 255) String contactName,
            @Email(message = "Enter a valid email address") @Size(max = 255) String email,
            @Size(max = 50, message = "Phone number may not exceed 50 characters") String phone,
            @Min(value = 0, message = "Lead time may not be negative") @Max(value = 60, message = "Lead time may not exceed 60 days") int leadTimeDays) {
    }

    public record SupplierResponse(Long id, String name, String contactName, String email, String phone,
                                   int leadTimeDays, long itemCount) {
    }

    // ------------------------------------------------------------------ purchase orders

    public record PurchaseOrderLineRequest(
            @NotNull(message = "Pick an item") Long itemId,
            @NotNull(message = "Quantity is required") @DecimalMin(value = "0.001", message = "Quantity must be more than zero")
            @DecimalMax(value = "999999", message = "The quantity is too large") BigDecimal quantity,
            @DecimalMin(value = "0", message = "Cost may not be negative") BigDecimal unitCost) {
    }

    public record PurchaseOrderRequest(
            @NotNull(message = "Pick a supplier") Long supplierId,
            LocalDate expectedAt,
            @Size(max = 1000, message = "Notes may not exceed 1000 characters") String note,
            @NotEmpty(message = "Add at least one item") @Size(max = 100) List<@Valid PurchaseOrderLineRequest> lines) {
    }

    public record PurchaseOrderLineResponse(Long id, Long itemId, String itemName, StockUnit unit,
                                            BigDecimal quantity, BigDecimal unitCost, BigDecimal total) {
    }

    public record PurchaseOrderResponse(Long id, Long supplierId, String supplierName, PurchaseOrderStatus status,
                                        String note, LocalDate expectedAt, String createdByName, LocalDateTime createdAt,
                                        LocalDateTime orderedAt, LocalDateTime receivedAt, String receivedByName,
                                        int lineCount, BigDecimal total, List<PurchaseOrderLineResponse> lines) {
    }
}
