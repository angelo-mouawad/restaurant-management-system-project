package be.ucll.se.courses.backend.events;

import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.enums.ShiftChangeType;
import be.ucll.se.courses.backend.model.PurchaseOrder;
import be.ucll.se.courses.backend.model.SchedulePeriod;
import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.model.User;

import java.time.LocalDate;
import java.util.Collection;

/**
 * Things that happen in the domain and that somebody should hear about. Services publish them;
 * {@link NotificationEventListener} decides who gets told and how. They are handled in the same
 * transaction, so a change that rolls back never leaves a notification behind.
 */
public final class DomainEvents {

    private DomainEvents() {}

    public record AccountCreated(User user, User createdBy) {}

    public record RoleChanged(User user, Role previousRole, Role newRole, User changedBy) {}

    /** An employee saved availability for the dates between {@code from} and {@code to}. */
    public record AvailabilitySubmitted(User employee, LocalDate from, LocalDate to, int days) {}

    public record SchedulePublished(SchedulePeriod period, Collection<User> employees, User publishedBy) {}

    /** A shift in a week that was already published was added, moved or removed. */
    public record ShiftChanged(User affected, SchedulePeriod period, ShiftChangeType changeType,
                               LocalDate date, String description) {}

    public record LowStock(StockItem item) {}

    public record PurchaseOrderReceived(PurchaseOrder order, User receivedBy) {}
}
