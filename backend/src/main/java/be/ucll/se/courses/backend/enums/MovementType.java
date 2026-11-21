package be.ucll.se.courses.backend.enums;

/** INITIAL is the opening balance. DELIVERY adds, USAGE and WASTE subtract, CORRECTION sets a counted quantity. */
public enum MovementType {
    INITIAL,
    DELIVERY,
    USAGE,
    WASTE,
    CORRECTION;

    public boolean isOutgoing() {
        return this == USAGE || this == WASTE;
    }
}
