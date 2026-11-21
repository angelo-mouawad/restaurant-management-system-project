package be.ucll.se.courses.backend.events;

import be.ucll.se.courses.backend.enums.NotificationType;
import be.ucll.se.courses.backend.model.PurchaseOrder;
import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.service.NotificationService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/** Turns domain events into stored notifications for the right people, each with a link to act on. */
@Component
public class NotificationEventListener {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM", java.util.Locale.ENGLISH);

    private final NotificationService notifications;

    public NotificationEventListener(NotificationService notifications) {
        this.notifications = notifications;
    }

    @EventListener
    public void on(DomainEvents.AccountCreated event) {
        final String by = event.createdBy() == null ? "An administrator" : event.createdBy().getName();
        notifications.notify(event.user(), NotificationType.ACCOUNT_CREATED,
                "Welcome to the team",
                by + " created your account. Check your profile and add your availability.",
                params("by", by, "role", event.user().getRole().name()),
                "/profile");
    }

    @EventListener
    public void on(DomainEvents.RoleChanged event) {
        final String by = event.changedBy() == null ? "An administrator" : event.changedBy().getName();
        notifications.notify(event.user(), NotificationType.ROLE_CHANGED,
                "Your role changed",
                by + " changed your role from " + label(event.previousRole().name()) + " to " + label(event.newRole().name()) + ".",
                params("by", by, "from", event.previousRole().name(), "to", event.newRole().name()),
                "/profile");
    }

    @EventListener
    public void on(DomainEvents.AvailabilitySubmitted event) {
        final String name = event.employee().getName();
        final String range = event.from().equals(event.to())
                ? DAY.format(event.from())
                : DAY.format(event.from()) + " to " + DAY.format(event.to());
        notifications.notifyAll(notifications.managersOf(event.employee()), NotificationType.AVAILABILITY_SUBMITTED,
                "Availability updated",
                name + " updated their availability for " + range + ".",
                params("name", name, "from", event.from().toString(), "to", event.to().toString(), "days", event.days()),
                "/schedule/planning?week=" + event.from().with(java.time.DayOfWeek.MONDAY)
                        + "&employee=" + event.employee().getId());
    }

    @EventListener
    public void on(DomainEvents.SchedulePublished event) {
        final String week = event.period().getWeekStart().toString();
        final String by = event.publishedBy() == null ? "Your manager" : event.publishedBy().getName();
        notifications.notifyAll(event.employees(), NotificationType.SCHEDULE_PUBLISHED,
                "New schedule published",
                by + " published the schedule for the week of " + DAY.format(event.period().getWeekStart()) + ".",
                params("week", week, "by", by),
                "/schedule/my?week=" + week);
    }

    @EventListener
    public void on(DomainEvents.ShiftChanged event) {
        final String title = switch (event.changeType()) {
            case ASSIGNED -> "Shift added";
            case MODIFIED -> "Shift changed";
            case REMOVED -> "Shift removed";
        };
        notifications.notify(event.affected(), NotificationType.SHIFT_CHANGED,
                title,
                event.description(),
                params("change", event.changeType().name(), "date", event.date().toString(),
                        "description", event.description()),
                "/schedule/my?week=" + event.period().getWeekStart());
    }

    @EventListener
    public void on(DomainEvents.LowStock event) {
        final StockItem item = event.item();
        final String quantity = item.getQuantity().stripTrailingZeros().toPlainString();
        final String threshold = item.getMinThreshold().stripTrailingZeros().toPlainString();
        final String unit = item.getUnit().label();
        notifications.notifyAll(notifications.management(), NotificationType.LOW_STOCK,
                "Low stock: " + item.getName(),
                item.getName() + " is down to " + quantity + " " + unit + ", below its minimum of " + threshold + ".",
                params("item", item.getName(), "quantity", quantity, "threshold", threshold, "unit", item.getUnit().name()),
                "/stock?item=" + item.getId());
    }

    @EventListener
    public void on(DomainEvents.PurchaseOrderReceived event) {
        final PurchaseOrder order = event.order();
        final String by = event.receivedBy() == null ? "Someone" : event.receivedBy().getName();
        notifications.notifyAll(notifications.management(), NotificationType.PURCHASE_ORDER_RECEIVED,
                "Order PO-" + order.getId() + " received",
                by + " received order PO-" + order.getId() + " from " + order.getSupplier().getName()
                        + ". " + order.getLines().size() + " items were added to stock.",
                params("order", order.getId(), "supplier", order.getSupplier().getName(), "by", by,
                        "lines", order.getLines().size()),
                "/stock/orders/" + order.getId());
    }

    private static Map<String, Object> params(Object... keyValues) {
        final Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            map.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
        }
        return map;
    }

    private static String label(String role) {
        return role.charAt(0) + role.substring(1).toLowerCase();
    }
}
