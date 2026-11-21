package be.ucll.se.courses.backend.enums;

/** DRAFT, then ORDERED from the supplier, then RECEIVED into stock. CANCELLED from either open state. */
public enum PurchaseOrderStatus {
    DRAFT,
    ORDERED,
    RECEIVED,
    CANCELLED
}
