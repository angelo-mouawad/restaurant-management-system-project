package be.ucll.se.courses.backend.model;

import be.ucll.se.courses.backend.enums.StockCategory;
import be.ucll.se.courses.backend.enums.StockUnit;
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

/**
 * An ingredient or supply. The quantity is a running total that only ever changes through a
 * {@link StockMovement}; nothing writes it directly.
 */
@Entity
public class StockItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StockCategory category = StockCategory.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StockUnit unit = StockUnit.PIECE;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity = BigDecimal.ZERO;

    @Column(name = "min_threshold", nullable = false, precision = 12, scale = 3)
    private BigDecimal minThreshold = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Column(name = "cost_per_unit", nullable = false, precision = 12, scale = 2)
    private BigDecimal costPerUnit = BigDecimal.ZERO;

    /** Archived items keep their history but no longer show in stock lists. */
    @Column(nullable = false)
    private boolean archived;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    protected StockItem() {}

    public StockItem(String name, StockCategory category, StockUnit unit, BigDecimal minThreshold,
                     BigDecimal costPerUnit, Supplier supplier) {
        this.name = name;
        this.category = category;
        this.unit = unit;
        this.minThreshold = minThreshold;
        this.costPerUnit = costPerUnit;
        this.supplier = supplier;
    }

    public boolean isLow() {
        return quantity.compareTo(minThreshold) < 0;
    }

    public BigDecimal getStockValue() {
        return quantity.multiply(costPerUnit);
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public StockCategory getCategory() { return category; }
    public void setCategory(StockCategory category) { this.category = category; }
    public StockUnit getUnit() { return unit; }
    public void setUnit(StockUnit unit) { this.unit = unit; }
    public BigDecimal getQuantity() { return quantity; }
    /** Only {@code StockService} calls this, right after recording the movement that explains it. */
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public BigDecimal getMinThreshold() { return minThreshold; }
    public void setMinThreshold(BigDecimal minThreshold) { this.minThreshold = minThreshold; }
    public Supplier getSupplier() { return supplier; }
    public void setSupplier(Supplier supplier) { this.supplier = supplier; }
    public BigDecimal getCostPerUnit() { return costPerUnit; }
    public void setCostPerUnit(BigDecimal costPerUnit) { this.costPerUnit = costPerUnit; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
