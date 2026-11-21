package be.ucll.se.courses.backend.exception;

import java.util.List;

/**
 * A request that is well formed but breaks a rule of the restaurant, such as double booking someone
 * or receiving an order twice. Answered with 409 and a stable code.
 */
public class BusinessRuleException extends RuntimeException {

    private final String code;
    private final List<String> details;

    public BusinessRuleException(String code, String message) {
        this(code, message, List.of());
    }

    public BusinessRuleException(String code, String message, List<String> details) {
        super(message);
        this.code = code;
        this.details = details == null ? List.of() : List.copyOf(details);
    }

    public String getCode() {
        return code;
    }

    public List<String> getDetails() {
        return details;
    }
}
