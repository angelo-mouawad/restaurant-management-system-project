package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.StockDtos.MovementResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.PurchaseOrderLineResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.PurchaseOrderResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.StockItemResponse;
import be.ucll.se.courses.backend.model.PurchaseOrder;
import be.ucll.se.courses.backend.model.PurchaseOrderLine;
import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.model.StockMovement;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

final class StockMapper {

    private StockMapper() {}

    static StockItemResponse toItemResponse(StockItem item) {
        return new StockItemResponse(item.getId(), item.getName(), item.getCategory(), item.getUnit(),
                scale3(item.getQuantity()), scale3(item.getMinThreshold()), item.getCostPerUnit(),
                item.getStockValue().setScale(2, RoundingMode.HALF_UP), item.isLow(), item.isArchived(),
                item.getSupplier() == null ? null : item.getSupplier().getId(),
                item.getSupplier() == null ? null : item.getSupplier().getName());
    }

    static MovementResponse toMovementResponse(StockMovement movement) {
        return new MovementResponse(movement.getId(), movement.getItem().getId(), movement.getItem().getName(),
                movement.getItem().getUnit(), movement.getType(), scale3(movement.getQuantityChange()),
                scale3(movement.getQuantityAfter()), movement.getReason(),
                movement.getUser() == null ? null : movement.getUser().getName(),
                movement.getPurchaseOrder() == null ? null : movement.getPurchaseOrder().getId(),
                movement.getCreatedAt());
    }

    static PurchaseOrderResponse toOrderResponse(PurchaseOrder order, boolean withLines) {
        final List<PurchaseOrderLineResponse> lines = withLines
                ? order.getLines().stream().map(StockMapper::toLineResponse).toList()
                : List.of();
        return new PurchaseOrderResponse(order.getId(), order.getSupplier().getId(), order.getSupplier().getName(),
                order.getStatus(), order.getNote(), order.getExpectedAt(),
                order.getCreatedBy() == null ? null : order.getCreatedBy().getName(), order.getCreatedAt(),
                order.getOrderedAt(), order.getReceivedAt(),
                order.getReceivedBy() == null ? null : order.getReceivedBy().getName(),
                order.getLines().size(), order.getTotal().setScale(2, RoundingMode.HALF_UP), lines);
    }

    private static PurchaseOrderLineResponse toLineResponse(PurchaseOrderLine line) {
        return new PurchaseOrderLineResponse(line.getId(), line.getItem().getId(), line.getItem().getName(),
                line.getItem().getUnit(), scale3(line.getQuantity()), line.getUnitCost(),
                line.getTotal().setScale(2, RoundingMode.HALF_UP));
    }

    /** Quantities travel as plain numbers without trailing zeros: 12, 2.5, 0.125. */
    static BigDecimal scale3(BigDecimal value) {
        final BigDecimal stripped = value.setScale(3, RoundingMode.HALF_UP).stripTrailingZeros();
        return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }
}
