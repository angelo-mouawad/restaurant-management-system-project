package be.ucll.se.courses.backend.model;

import be.ucll.se.courses.backend.enums.MovementType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** One recorded change to an item's quantity. Never updated or deleted once written. */
@Entity
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_item_id", nullable = false)
    private StockItem item;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MovementType type;

    /** Signed: positive adds stock, negative removes it. */
    @Column(name = "quantity_change", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityChange;

    @Column(name = "quantity_after", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityAfter;

    private String reason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id")
    private PurchaseOrder purchaseOrder;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    protected StockMovement() {}

    public StockMovement(StockItem item, MovementType type, BigDecimal quantityChange, BigDecimal quantityAfter,
                         String reason, User user, PurchaseOrder purchaseOrder) {
        this.item = item;
        this.type = type;
        this.quantityChange = quantityChange;
        this.quantityAfter = quantityAfter;
        this.reason = reason;
        this.user = user;
        this.purchaseOrder = purchaseOrder;
    }

    public Long getId() { return id; }
    public StockItem getItem() { return item; }
    public MovementType getType() { return type; }
    public BigDecimal getQuantityChange() { return quantityChange; }
    public BigDecimal getQuantityAfter() { return quantityAfter; }
    public String getReason() { return reason; }
    public User getUser() { return user; }
    public PurchaseOrder getPurchaseOrder() { return purchaseOrder; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    /** Seed data only, to spread history over past days. */
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
