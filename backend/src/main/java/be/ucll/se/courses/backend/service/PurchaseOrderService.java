package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.StockDtos.PurchaseOrderLineRequest;
import be.ucll.se.courses.backend.dtos.StockDtos.PurchaseOrderRequest;
import be.ucll.se.courses.backend.dtos.StockDtos.PurchaseOrderResponse;
import be.ucll.se.courses.backend.enums.MovementType;
import be.ucll.se.courses.backend.enums.PurchaseOrderStatus;
import be.ucll.se.courses.backend.events.DomainEvents;
import be.ucll.se.courses.backend.exception.BusinessRuleException;
import be.ucll.se.courses.backend.model.PurchaseOrder;
import be.ucll.se.courses.backend.model.PurchaseOrderLine;
import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.model.Supplier;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.PurchaseOrderRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Orders to suppliers: DRAFT while being put together, ORDERED once sent, RECEIVED when the
 * delivery arrives. Receiving books every line into stock in one transaction.
 */
@Service
@Transactional
public class PurchaseOrderService {

    private final PurchaseOrderRepository orderRepository;
    private final StockService stockService;
    private final SupplierService supplierService;
    private final CurrentUserService currentUserService;
    private final ApplicationEventPublisher events;

    public PurchaseOrderService(PurchaseOrderRepository orderRepository, StockService stockService,
                                SupplierService supplierService, CurrentUserService currentUserService,
                                ApplicationEventPublisher events) {
        this.orderRepository = orderRepository;
        this.stockService = stockService;
        this.supplierService = supplierService;
        this.currentUserService = currentUserService;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> list() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(order -> StockMapper.toOrderResponse(order, false)).toList();
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse get(Long id) {
        return StockMapper.toOrderResponse(find(id), true);
    }

    public PurchaseOrderResponse create(PurchaseOrderRequest request) {
        final Supplier supplier = supplierService.find(request.supplierId());
        final PurchaseOrder order = new PurchaseOrder(supplier, currentUserService.get());
        fill(order, request);
        if (order.getExpectedAt() == null) {
            order.setExpectedAt(LocalDate.now().plusDays(supplier.getLeadTimeDays()));
        }
        return StockMapper.toOrderResponse(orderRepository.save(order), true);
    }

    public PurchaseOrderResponse update(Long id, PurchaseOrderRequest request) {
        final PurchaseOrder order = find(id);
        requireStatus(order, PurchaseOrderStatus.DRAFT, "Only draft orders can be edited.");
        order.setSupplier(supplierService.find(request.supplierId()));
        order.getLines().clear();
        fill(order, request);
        return StockMapper.toOrderResponse(order, true);
    }

    public PurchaseOrderResponse markOrdered(Long id) {
        final PurchaseOrder order = find(id);
        requireStatus(order, PurchaseOrderStatus.DRAFT, "Only draft orders can be sent.");
        if (order.getLines().isEmpty()) {
            throw new BusinessRuleException("EMPTY_ORDER", "Add at least one item before sending the order.");
        }
        order.setStatus(PurchaseOrderStatus.ORDERED);
        order.setOrderedAt(LocalDateTime.now());
        return StockMapper.toOrderResponse(order, true);
    }

    /** Books every line into stock as a delivery, in one transaction: all of it or none of it. */
    public PurchaseOrderResponse receive(Long id) {
        final User actor = currentUserService.get();
        final PurchaseOrder order = find(id);
        if (order.getStatus() == PurchaseOrderStatus.RECEIVED) {
            throw new BusinessRuleException("ALREADY_RECEIVED", "This order was already received.");
        }
        requireStatus(order, PurchaseOrderStatus.ORDERED, "Send the order to the supplier before receiving it.");
        for (PurchaseOrderLine line : order.getLines()) {
            stockService.apply(line.getItem().getId(), MovementType.DELIVERY, line.getQuantity(),
                    "Received with PO-" + order.getId(), actor, order);
        }
        order.setStatus(PurchaseOrderStatus.RECEIVED);
        order.setReceivedAt(LocalDateTime.now());
        order.setReceivedBy(actor);
        events.publishEvent(new DomainEvents.PurchaseOrderReceived(order, actor));
        return StockMapper.toOrderResponse(order, true);
    }

    public PurchaseOrderResponse cancel(Long id) {
        final PurchaseOrder order = find(id);
        if (order.getStatus() != PurchaseOrderStatus.DRAFT && order.getStatus() != PurchaseOrderStatus.ORDERED) {
            throw new BusinessRuleException("ORDER_CLOSED", "Only open orders can be cancelled.");
        }
        order.setStatus(PurchaseOrderStatus.CANCELLED);
        return StockMapper.toOrderResponse(order, true);
    }

    public void delete(Long id) {
        final PurchaseOrder order = find(id);
        requireStatus(order, PurchaseOrderStatus.DRAFT, "Only draft orders can be deleted. Cancel it instead.");
        orderRepository.delete(order);
    }

    private void fill(PurchaseOrder order, PurchaseOrderRequest request) {
        order.setNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
        if (request.expectedAt() != null) {
            order.setExpectedAt(request.expectedAt());
        }
        final Set<Long> seen = new HashSet<>();
        for (PurchaseOrderLineRequest line : request.lines()) {
            if (!seen.add(line.itemId())) {
                throw new IllegalArgumentException("Each item can only appear once in an order.");
            }
            final StockItem item = stockService.find(line.itemId());
            if (item.isArchived()) {
                throw new BusinessRuleException("ITEM_ARCHIVED", item.getName() + " is archived and cannot be ordered.");
            }
            final BigDecimal cost = line.unitCost() == null ? item.getCostPerUnit() : line.unitCost();
            order.addLine(item, line.quantity(), cost.setScale(2, RoundingMode.HALF_UP));
        }
    }

    private PurchaseOrder find(Long id) {
        return orderRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Purchase order not found."));
    }

    private static void requireStatus(PurchaseOrder order, PurchaseOrderStatus status, String message) {
        if (order.getStatus() != status) {
            throw new BusinessRuleException("WRONG_ORDER_STATUS", message);
        }
    }
}
