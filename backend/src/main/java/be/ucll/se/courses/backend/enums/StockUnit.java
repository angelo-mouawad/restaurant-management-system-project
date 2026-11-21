package be.ucll.se.courses.backend.enums;

public enum StockUnit {
    KG("kg"),
    G("g"),
    L("L"),
    ML("ml"),
    PIECE("pcs"),
    BOX("boxes"),
    BOTTLE("bottles"),
    CAN("cans"),
    PACK("packs");

    private final String label;

    StockUnit(String label) {
        this.label = label;
    }

    /** Short label for messages, for example "12 kg" or "40 pcs". */
    public String label() {
        return label;
    }
}
