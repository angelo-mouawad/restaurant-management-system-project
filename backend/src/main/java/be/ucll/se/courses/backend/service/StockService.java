package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.PageResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.MovementRequest;
import be.ucll.se.courses.backend.dtos.StockDtos.MovementResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.StockItemDetailResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.StockItemRequest;
import be.ucll.se.courses.backend.dtos.StockDtos.StockItemResponse;
import be.ucll.se.courses.backend.dtos.StockDtos.StockOverviewResponse;
import be.ucll.se.courses.backend.enums.MovementType;
import be.ucll.se.courses.backend.enums.PurchaseOrderStatus;
import be.ucll.se.courses.backend.events.DomainEvents;
import be.ucll.se.courses.backend.exception.BusinessRuleException;
import be.ucll.se.courses.backend.model.PurchaseOrder;
import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.model.StockMovement;
import be.ucll.se.courses.backend.model.Supplier;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.PurchaseOrderRepository;
import be.ucll.se.courses.backend.repository.StockItemRepository;
import be.ucll.se.courses.backend.repository.StockMovementRepository;
import be.ucll.se.courses.backend.repository.SupplierRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * Stock items and their movements. A quantity only ever changes by writing a movement, inside the
 * same transaction and with the item row locked, so history and totals can never disagree.
 */
@Service
@Transactional
public class StockService {

    private final StockItemRepository itemRepository;
    private final StockMovementRepository movementRepository;
    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository orderRepository;
    private final CurrentUserService currentUserService;
    private final ApplicationEventPublisher events;

    public StockService(StockItemRepository itemRepository,
                        StockMovementRepository movementRepository,
                        SupplierRepository supplierRepository,
                        PurchaseOrderRepository orderRepository,
                        CurrentUserService currentUserService,
                        ApplicationEventPublisher events) {
        this.itemRepository = itemRepository;
        this.movementRepository = movementRepository;
        this.supplierRepository = supplierRepository;
        this.orderRepository = orderRepository;
        this.currentUserService = currentUserService;
        this.events = events;
    }

    // ------------------------------------------------------------------ items

    @Transactional(readOnly = true)
    public List<StockItemResponse> list(boolean includeArchived) {
        return itemRepository.findAllWithSupplier(includeArchived).stream().map(StockMapper::toItemResponse).toList();
    }

    @Transactional(readOnly = true)
    public StockItemDetailResponse detail(Long id) {
        final StockItem item = find(id);
        final List<MovementResponse> movements = movementRepository.search(id, null, null, PageRequest.of(0, 15))
                .map(StockMapper::toMovementResponse).getContent();
        return new StockItemDetailResponse(StockMapper.toItemResponse(item), movements);
    }

    public StockItemResponse create(StockItemRequest request) {
        final User actor = currentUserService.get();
        final String name = request.name().trim();
        if (itemRepository.existsByNameIgnoreCaseAndArchivedFalse(name)) {
            throw new BusinessRuleException("ITEM_EXISTS", "There is already an item called " + name + ".");
        }
        final StockItem item = itemRepository.save(new StockItem(name, request.category(), request.unit(),
                request.minThreshold(), money(request.costPerUnit()), supplier(request.supplierId())));
        final BigDecimal opening = request.initialQuantity() == null ? BigDecimal.ZERO : request.initialQuantity();
        if (opening.signum() > 0) {
            item.setQuantity(opening);
            movementRepository.save(new StockMovement(item, MovementType.INITIAL, opening, opening,
                    "Opening balance", actor, null));
        }
        if (item.isLow()) {
            events.publishEvent(new DomainEvents.LowStock(item));
        }
        return StockMapper.toItemResponse(item);
    }

    /** Changes everything except the quantity, which only moves through movements. */
    public StockItemResponse update(Long id, StockItemRequest request) {
        final StockItem item = find(id);
        final String name = request.name().trim();
        if (itemRepository.existsByNameIgnoreCaseAndArchivedFalseAndIdNot(name, id)) {
            throw new BusinessRuleException("ITEM_EXISTS", "There is already an item called " + name + ".");
        }
        final boolean wasLow = item.isLow();
        item.setName(name);
        item.setCategory(request.category());
        item.setUnit(request.unit());
        item.setMinThreshold(request.minThreshold());
        item.setCostPerUnit(money(request.costPerUnit()));
        item.setSupplier(supplier(request.supplierId()));
        if (!wasLow && item.isLow() && !item.isArchived()) {
            events.publishEvent(new DomainEvents.LowStock(item));
        }
        return StockMapper.toItemResponse(item);
    }

    /** Archived items disappear from lists and orders but keep their history. */
    public StockItemResponse setArchived(Long id, boolean archived) {
        final StockItem item = find(id);
        if (!archived && itemRepository.existsByNameIgnoreCaseAndArchivedFalseAndIdNot(item.getName(), id)) {
            throw new BusinessRuleException("ITEM_EXISTS", "Another active item is already called " + item.getName() + ".");
        }
        item.setArchived(archived);
        return StockMapper.toItemResponse(item);
    }

    // ------------------------------------------------------------------ movements

    public MovementResponse recordMovement(Long itemId, MovementRequest request) {
        if (request.type() == MovementType.INITIAL) {
            throw new IllegalArgumentException("Opening balances are only set when an item is created.");
        }
        if ((request.type() == MovementType.WASTE || request.type() == MovementType.CORRECTION)
                && (request.reason() == null || request.reason().isBlank())) {
            throw new IllegalArgumentException(request.type() == MovementType.WASTE
                    ? "Say why the stock was thrown away."
                    : "Say why the count is being corrected.");
        }
        if (request.type() != MovementType.CORRECTION && request.quantity().signum() == 0) {
            throw new IllegalArgumentException("The quantity has to be more than zero.");
        }
        final StockMovement movement = apply(itemId, request.type(), request.quantity(), request.reason(),
                currentUserService.get(), null);
        return StockMapper.toMovementResponse(movement);
    }

    /**
     * The single place quantities change. Locks the item, works out the new total, refuses to go
     * below zero, writes the movement, and raises a low stock alert when the item crosses its threshold.
     */
    StockMovement apply(Long itemId, MovementType type, BigDecimal quantity, String reason, User actor, PurchaseOrder order) {
        final StockItem item = itemRepository.findByIdForUpdate(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Stock item not found."));
        if (item.isArchived()) {
            throw new BusinessRuleException("ITEM_ARCHIVED", item.getName() + " is archived. Restore it before changing its stock.");
        }
        final BigDecimal before = item.getQuantity();
        final BigDecimal change = switch (type) {
            case DELIVERY, INITIAL -> quantity;
            case USAGE, WASTE -> quantity.negate();
            case CORRECTION -> quantity.subtract(before);
        };
        if (type == MovementType.CORRECTION && change.signum() == 0) {
            throw new IllegalArgumentException("The counted quantity matches what is already recorded.");
        }
        final BigDecimal after = before.add(change);
        if (after.signum() < 0) {
            throw new BusinessRuleException("INSUFFICIENT_STOCK", "Only " + StockMapper.scale3(before).toPlainString() + " "
                    + item.getUnit().label() + " of " + item.getName() + " is in stock.");
        }
        final boolean wasLow = item.isLow();
        item.setQuantity(after);
        final StockMovement movement = movementRepository.save(new StockMovement(item, type, change, after,
                reason == null || reason.isBlank() ? null : reason.trim(), actor, order));
        if (!wasLow && item.isLow()) {
            events.publishEvent(new DomainEvents.LowStock(item));
        }
        return movement;
    }

    @Transactional(readOnly = true)
    public PageResponse<MovementResponse> movements(Long itemId, MovementType type, Integer days, int page, int size) {
        final var from = days == null ? null : LocalDate.now().minusDays(days).atStartOfDay();
        return PageResponse.of(movementRepository.search(itemId, type, from,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100))), StockMapper::toMovementResponse);
    }

    // ------------------------------------------------------------------ overview

    @Transactional(readOnly = true)
    public StockOverviewResponse overview() {
        final List<StockItem> items = itemRepository.findAllWithSupplier(false);
        final BigDecimal total = items.stream().map(StockItem::getStockValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        final List<StockItemResponse> low = items.stream().filter(StockItem::isLow)
                .sorted(Comparator.comparing(item -> item.getQuantity().divide(
                        item.getMinThreshold().signum() == 0 ? BigDecimal.ONE : item.getMinThreshold(), 4, RoundingMode.HALF_UP)))
                .map(StockMapper::toItemResponse).toList();
        final List<MovementResponse> recent = movementRepository.search(null, null, null, PageRequest.of(0, 8))
                .map(StockMapper::toMovementResponse).getContent();
        final long openOrders = orderRepository.countByStatusIn(List.of(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.ORDERED));
        return new StockOverviewResponse(total, items.size(), low.size(), openOrders, low, recent);
    }

    // ------------------------------------------------------------------ helpers

    StockItem find(Long id) {
        return itemRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Stock item not found."));
    }

    private Supplier supplier(Long id) {
        return id == null ? null : supplierRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Supplier not found."));
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
