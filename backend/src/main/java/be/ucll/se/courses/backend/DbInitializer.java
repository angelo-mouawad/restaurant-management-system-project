package be.ucll.se.courses.backend;

import be.ucll.se.courses.backend.enums.AvailabilityStatus;
import be.ucll.se.courses.backend.enums.MovementType;
import be.ucll.se.courses.backend.enums.NotificationType;
import be.ucll.se.courses.backend.enums.PeriodStatus;
import be.ucll.se.courses.backend.enums.PurchaseOrderStatus;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.enums.ShiftChangeType;
import be.ucll.se.courses.backend.enums.StockCategory;
import be.ucll.se.courses.backend.enums.StockUnit;
import be.ucll.se.courses.backend.model.Availability;
import be.ucll.se.courses.backend.model.Notification;
import be.ucll.se.courses.backend.model.PurchaseOrder;
import be.ucll.se.courses.backend.model.SchedulePeriod;
import be.ucll.se.courses.backend.model.Shift;
import be.ucll.se.courses.backend.model.ShiftChange;
import be.ucll.se.courses.backend.model.ShiftType;
import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.model.StockMovement;
import be.ucll.se.courses.backend.model.Supplier;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.AvailabilityRepository;
import be.ucll.se.courses.backend.repository.NotificationRepository;
import be.ucll.se.courses.backend.repository.PurchaseOrderRepository;
import be.ucll.se.courses.backend.repository.SchedulePeriodRepository;
import be.ucll.se.courses.backend.repository.ShiftChangeRepository;
import be.ucll.se.courses.backend.repository.ShiftRepository;
import be.ucll.se.courses.backend.repository.ShiftTypeRepository;
import be.ucll.se.courses.backend.repository.StockItemRepository;
import be.ucll.se.courses.backend.repository.StockMovementRepository;
import be.ucll.se.courses.backend.repository.SupplierRepository;
import be.ucll.se.courses.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * Demo data so every role and flow can be tried straight away. Each part only runs when its own
 * table is empty, so it also tops up a database that came over from the old version (which already
 * has a couple of users and stock items) without touching what is there.
 */
@Component
public class DbInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DbInitializer.class);

    private final boolean enabled;
    private final UserRepository users;
    private final ShiftTypeRepository shiftTypes;
    private final SupplierRepository suppliers;
    private final StockItemRepository items;
    private final StockMovementRepository movements;
    private final PurchaseOrderRepository orders;
    private final AvailabilityRepository availability;
    private final SchedulePeriodRepository periods;
    private final ShiftRepository shifts;
    private final ShiftChangeRepository changes;
    private final NotificationRepository notifications;
    private final PasswordEncoder passwordEncoder;

    /** Fixed seed: the demo data looks the same on every machine. */
    private final Random random = new Random(42);

    public DbInitializer(@Value("${app.seed:true}") boolean enabled,
                         UserRepository users, ShiftTypeRepository shiftTypes, SupplierRepository suppliers,
                         StockItemRepository items, StockMovementRepository movements, PurchaseOrderRepository orders,
                         AvailabilityRepository availability, SchedulePeriodRepository periods, ShiftRepository shifts,
                         ShiftChangeRepository changes, NotificationRepository notifications,
                         PasswordEncoder passwordEncoder) {
        this.enabled = enabled;
        this.users = users;
        this.shiftTypes = shiftTypes;
        this.suppliers = suppliers;
        this.items = items;
        this.movements = movements;
        this.orders = orders;
        this.availability = availability;
        this.periods = periods;
        this.shifts = shifts;
        this.changes = changes;
        this.notifications = notifications;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        final Map<String, User> team = seedUsers();
        final List<ShiftType> types = seedShiftTypes();
        final Map<String, Supplier> supplierMap = seedSuppliers();
        final boolean freshStock = orders.count() == 0;
        final Map<String, StockItem> stock = seedStock(supplierMap, team.get("tom"));
        if (freshStock) {
            seedOrders(supplierMap, stock, team);
        }
        if (shifts.count() == 0 && availability.count() == 0) {
            seedAvailability(team);
            seedSchedule(team, types);
            seedNotifications(team, stock);
        }
        log.info("Demo data ready: {} users, {} shift types, {} stock items, {} shifts, {} notifications",
                users.count(), shiftTypes.count(), items.count(), shifts.count(), notifications.count());
    }

    // ------------------------------------------------------------------ people

    private record Person(String username, String name, Role role, String position, String email, String phone,
                          int hours, String manager, int joinedMonthsAgo) {}

    private Map<String, User> seedUsers() {
        final List<Person> people = List.of(
                new Person("angelo", "Angelo Mouawad", Role.ADMIN, "Owner", "angelo@bistro-demo.be", "+32 470 10 00 01", 40, null, 30),
                new Person("sara", "Sara Peeters", Role.MANAGER, "Floor manager", "sara@bistro-demo.be", "+32 470 10 00 02", 38, null, 24),
                new Person("tom", "Tom Willems", Role.MANAGER, "Kitchen manager", "tom@bistro-demo.be", "+32 470 10 00 03", 38, null, 18),
                new Person("hunein", "Hunein Haddad", Role.EMPLOYEE, "Server", "hunein@bistro-demo.be", "+32 470 20 00 01", 38, "sara", 14),
                new Person("lina", "Lina Janssens", Role.EMPLOYEE, "Server", "lina@bistro-demo.be", "+32 470 20 00 02", 24, "sara", 9),
                new Person("youssef", "Youssef El Amrani", Role.EMPLOYEE, "Bartender", "youssef@bistro-demo.be", "+32 470 20 00 03", 30, "sara", 11),
                new Person("emma", "Emma Claes", Role.EMPLOYEE, "Host", "emma@bistro-demo.be", "+32 470 20 00 04", 16, "sara", 4),
                new Person("noah", "Noah Maes", Role.EMPLOYEE, "Line cook", "noah@bistro-demo.be", "+32 470 20 00 05", 38, "tom", 20),
                new Person("mila", "Mila Wouters", Role.EMPLOYEE, "Line cook", "mila@bistro-demo.be", "+32 470 20 00 06", 30, "tom", 7),
                new Person("lucas", "Lucas Dubois", Role.EMPLOYEE, "Prep cook", "lucas@bistro-demo.be", "+32 470 20 00 07", 24, "tom", 5),
                new Person("nora", "Nora Vermeulen", Role.EMPLOYEE, "Dishwasher", "nora@bistro-demo.be", "+32 470 20 00 08", 20, "tom", 1));

        final Map<String, User> result = new LinkedHashMap<>();
        for (Person person : people) {
            final User user = users.findByUsername(person.username()).orElseGet(() -> {
                final User created = new User(person.name(), person.username(),
                        passwordEncoder.encode(person.username() + "123"), person.role());
                created.setJoinedAt(LocalDate.now().minusMonths(person.joinedMonthsAgo()));
                return created;
            });
            // Accounts carried over from the old version keep their password; only blanks are filled in.
            if (user.getId() != null && user.getName().equalsIgnoreCase(person.username())) {
                user.setName(person.name());
            }
            if (user.getEmail() == null && !users.existsByEmailIgnoreCase(person.email())) user.setEmail(person.email());
            if (user.getPhone() == null) user.setPhone(person.phone());
            if (user.getPosition() == null) user.setPosition(person.position());
            if (user.getId() == null) user.setMaxWeeklyHours(person.hours());
            if (person.role() != user.getRole() && user.getId() != null && person.role() == Role.ADMIN) user.setRole(Role.ADMIN);
            result.put(person.username(), users.save(user));
        }
        for (Person person : people) {
            final User user = result.get(person.username());
            if (person.manager() != null && user.getManager() == null && user.getRole() == Role.EMPLOYEE) {
                user.setManager(result.get(person.manager()));
            }
        }
        return result;
    }

    private List<ShiftType> seedShiftTypes() {
        if (shiftTypes.count() == 0) {
            final ShiftType lunch = new ShiftType("Lunch rush", LocalTime.of(11, 30), LocalTime.of(14, 30), 1, "amber");
            lunch.setDays(List.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY));
            final ShiftType closing = new ShiftType("Closing", LocalTime.of(21, 0), LocalTime.of(1, 0), 1, "rose");
            closing.setDays(List.of(DayOfWeek.FRIDAY, DayOfWeek.SATURDAY));
            shiftTypes.saveAll(List.of(
                    new ShiftType("Morning", LocalTime.of(9, 0), LocalTime.of(15, 0), 2, "teal"),
                    lunch,
                    new ShiftType("Evening", LocalTime.of(17, 0), LocalTime.of(23, 0), 2, "indigo"),
                    closing));
        }
        return shiftTypes.findAllByOrderByStartTime();
    }

    // ------------------------------------------------------------------ stock

    private Map<String, Supplier> seedSuppliers() {
        if (suppliers.count() == 0) {
            suppliers.saveAll(List.of(
                    new Supplier("Vers & Co", "Ilse Mertens", "orders@versenco.be", "+32 16 22 11 00", 1),
                    new Supplier("Slagerij Peeters", "Jan Peeters", "jan@slagerijpeeters.be", "+32 16 23 45 67", 2),
                    new Supplier("Metro Cash & Carry", "Account desk", "leuven@metro.be", "+32 16 30 40 50", 3),
                    new Supplier("Leuven Drinks", "Karim Bensaid", "sales@leuvendrinks.be", "+32 16 44 55 66", 4)));
        }
        final Map<String, Supplier> result = new HashMap<>();
        suppliers.findAllByOrderByName().forEach(s -> result.put(s.getName(), s));
        return result;
    }

    /** name, category, unit, threshold, cost, supplier, daily use, end quantity relative to threshold. */
    private record Product(String name, StockCategory category, StockUnit unit, double threshold, double cost,
                           String supplier, double dailyUse, double endRatio) {}

    private Map<String, StockItem> seedStock(Map<String, Supplier> supplierMap, User actor) {
        final List<Product> products = List.of(
                // The ten items of the original system, now with full details.
                new Product("Nuggets", StockCategory.FROZEN, StockUnit.KG, 8, 7.90, "Metro Cash & Carry", 1.5, 1.6),
                new Product("Tenders", StockCategory.FROZEN, StockUnit.KG, 8, 9.40, "Metro Cash & Carry", 1.2, 1.4),
                new Product("Falafel", StockCategory.FROZEN, StockUnit.KG, 5, 8.20, "Metro Cash & Carry", 0.8, 1.8),
                new Product("Fries", StockCategory.FROZEN, StockUnit.KG, 25, 2.10, "Metro Cash & Carry", 6, 1.3),
                new Product("Meat", StockCategory.MEAT, StockUnit.KG, 10, 11.50, "Slagerij Peeters", 2.5, 0.6),
                new Product("Hot dogs", StockCategory.MEAT, StockUnit.PIECE, 40, 0.65, "Slagerij Peeters", 12, 1.5),
                new Product("Patties", StockCategory.MEAT, StockUnit.PIECE, 60, 1.20, "Slagerij Peeters", 25, 0.7),
                new Product("Buns", StockCategory.DRY_GOODS, StockUnit.PIECE, 80, 0.35, "Metro Cash & Carry", 30, 1.4),
                new Product("Sauce", StockCategory.SAUCES, StockUnit.L, 6, 4.80, "Metro Cash & Carry", 1, 1.5),
                new Product("Cola", StockCategory.BEVERAGES, StockUnit.CAN, 96, 0.55, "Leuven Drinks", 30, 1.7),
                // The rest of the kitchen.
                new Product("Tomatoes", StockCategory.PRODUCE, StockUnit.KG, 8, 2.60, "Vers & Co", 2.5, 1.5),
                new Product("Lettuce", StockCategory.PRODUCE, StockUnit.PIECE, 15, 0.90, "Vers & Co", 6, 0.5),
                new Product("Red onions", StockCategory.PRODUCE, StockUnit.KG, 5, 1.40, "Vers & Co", 1.2, 2.0),
                new Product("Lemons", StockCategory.PRODUCE, StockUnit.PIECE, 30, 0.30, "Vers & Co", 8, 1.6),
                new Product("Chicken breast", StockCategory.MEAT, StockUnit.KG, 12, 9.80, "Slagerij Peeters", 3, 1.2),
                new Product("Salmon fillet", StockCategory.FISH, StockUnit.KG, 4, 24.50, "Vers & Co", 0.8, 1.5),
                new Product("Cheddar slices", StockCategory.DAIRY, StockUnit.PACK, 10, 3.90, "Metro Cash & Carry", 3, 0.8),
                new Product("Whole milk", StockCategory.DAIRY, StockUnit.L, 12, 1.10, "Metro Cash & Carry", 4, 1.5),
                new Product("Butter", StockCategory.DAIRY, StockUnit.KG, 3, 8.50, "Metro Cash & Carry", 0.6, 1.7),
                new Product("Basmati rice", StockCategory.DRY_GOODS, StockUnit.KG, 10, 2.30, "Metro Cash & Carry", 1.5, 2.2),
                new Product("Flour", StockCategory.DRY_GOODS, StockUnit.KG, 10, 0.95, "Metro Cash & Carry", 1, 2.5),
                new Product("Olive oil", StockCategory.DRY_GOODS, StockUnit.L, 5, 7.20, "Metro Cash & Carry", 0.7, 1.3),
                new Product("Ketchup", StockCategory.SAUCES, StockUnit.BOTTLE, 12, 2.40, "Metro Cash & Carry", 2, 1.4),
                new Product("Mayonnaise", StockCategory.SAUCES, StockUnit.L, 5, 4.10, "Metro Cash & Carry", 0.9, 1.6),
                new Product("Sparkling water", StockCategory.BEVERAGES, StockUnit.BOTTLE, 48, 0.45, "Leuven Drinks", 15, 1.8),
                new Product("Orange juice", StockCategory.BEVERAGES, StockUnit.L, 10, 2.20, "Leuven Drinks", 3, 0.9),
                new Product("Coffee beans", StockCategory.BEVERAGES, StockUnit.KG, 4, 18.00, "Metro Cash & Carry", 0.7, 1.4),
                new Product("Napkins", StockCategory.PACKAGING, StockUnit.PACK, 10, 3.20, "Metro Cash & Carry", 2, 1.6),
                new Product("Takeaway boxes", StockCategory.PACKAGING, StockUnit.BOX, 4, 22.00, "Metro Cash & Carry", 0.5, 1.5),
                new Product("Dish soap", StockCategory.CLEANING, StockUnit.L, 5, 3.60, "Metro Cash & Carry", 0.6, 1.2));

        final Map<String, StockItem> existing = new HashMap<>();
        items.findAllWithSupplier(true).forEach(item -> existing.put(item.getName().toLowerCase(Locale.ROOT), item));
        final Map<String, StockItem> result = new LinkedHashMap<>();

        for (Product product : products) {
            final StockItem current = existing.get(product.name().toLowerCase(Locale.ROOT));
            if (current != null) {
                // Carried over from the old version: give it the details it never had, leave its quantity alone.
                if (current.getCategory() == StockCategory.OTHER && current.getSupplier() == null) {
                    current.setCategory(product.category());
                    current.setUnit(product.unit());
                    current.setMinThreshold(bd(product.threshold()));
                    current.setCostPerUnit(bd(product.cost()).setScale(2, RoundingMode.HALF_UP));
                    current.setSupplier(supplierMap.get(product.supplier()));
                }
                result.put(product.name(), current);
                continue;
            }
            final StockItem item = items.save(new StockItem(product.name(), product.category(), product.unit(),
                    bd(product.threshold()), bd(product.cost()).setScale(2, RoundingMode.HALF_UP),
                    supplierMap.get(product.supplier())));
            seedHistory(item, product, actor);
            result.put(product.name(), item);
        }
        return result;
    }

    /** Four weeks of believable history: an opening count, daily usage, deliveries and the odd bit of waste. */
    private void seedHistory(StockItem item, Product product, User actor) {
        final LocalDate today = LocalDate.now();
        final double threshold = product.threshold();
        double quantity = round(threshold * 3);
        add(item, MovementType.INITIAL, quantity, quantity, "Opening count", actor, today.minusDays(28).atTime(8, 0));
        for (int day = 27; day >= 1; day--) {
            final LocalDate date = today.minusDays(day);
            final boolean busy = date.getDayOfWeek() == DayOfWeek.FRIDAY || date.getDayOfWeek() == DayOfWeek.SATURDAY;
            final double use = round(Math.min(quantity, product.dailyUse() * (busy ? 1.4 : 1.0) * (0.7 + random.nextDouble() * 0.6)));
            if (use > 0) {
                quantity = round(quantity - use);
                add(item, MovementType.USAGE, -use, quantity, null, null, date.atTime(22, 30));
            }
            if (day % 9 == 4 && random.nextBoolean()) {
                final double waste = round(Math.min(quantity, product.dailyUse() * 0.3));
                if (waste > 0) {
                    quantity = round(quantity - waste);
                    add(item, MovementType.WASTE, -waste, quantity, wasteReason(product.category()), actor, date.atTime(23, 0));
                }
            }
            if (quantity < threshold * 1.2 && day > 2) {
                final double delivered = round(threshold * 2.5);
                quantity = round(quantity + delivered);
                add(item, MovementType.DELIVERY, delivered, quantity, "Weekly delivery", actor, date.plusDays(1).atTime(7, 30));
            }
        }
        // Land each item where the demo wants it, so some are comfortably stocked and a few are running low.
        final double target = round(threshold * product.endRatio());
        if (target != quantity) {
            final double diff = round(target - quantity);
            quantity = target;
            if (diff < 0) {
                add(item, MovementType.USAGE, diff, quantity, null, null, today.atTime(9, 15));
            } else {
                add(item, MovementType.CORRECTION, diff, quantity, "Morning stock count", actor, today.atTime(8, 45));
            }
        }
        item.setQuantity(bd(quantity));
    }

    private void add(StockItem item, MovementType type, double change, double after, String reason, User user, LocalDateTime at) {
        final StockMovement movement = new StockMovement(item, type, bd(change), bd(after), reason, user, null);
        movement.setCreatedAt(at);
        movements.save(movement);
    }

    private static String wasteReason(StockCategory category) {
        return switch (category) {
            case PRODUCE -> "Went soft, past its best";
            case DAIRY, FISH, MEAT -> "Past use-by date";
            case BEVERAGES -> "Damaged in delivery";
            default -> "Dropped during service";
        };
    }

    private void seedOrders(Map<String, Supplier> supplierMap, Map<String, StockItem> stock, Map<String, User> team) {
        final User tom = team.get("tom");
        final User sara = team.get("sara");
        final LocalDateTime now = LocalDateTime.now();

        final PurchaseOrder received = new PurchaseOrder(supplierMap.get("Vers & Co"), tom);
        received.addLine(stock.get("Tomatoes"), bd(15), bd(2.60));
        received.addLine(stock.get("Red onions"), bd(8), bd(1.40));
        received.addLine(stock.get("Lemons"), bd(40), bd(0.30));
        received.setNote("Weekly produce order");
        received.setStatus(PurchaseOrderStatus.RECEIVED);
        received.setCreatedAt(now.minusDays(9));
        received.setOrderedAt(now.minusDays(9));
        received.setExpectedAt(LocalDate.now().minusDays(8));
        received.setReceivedAt(now.minusDays(8));
        received.setReceivedBy(tom);
        orders.save(received);

        // On its way: a manager can receive this one to see stock go up and the alert clear.
        final PurchaseOrder ordered = new PurchaseOrder(supplierMap.get("Slagerij Peeters"), tom);
        ordered.addLine(stock.get("Meat"), bd(20), bd(11.50));
        ordered.addLine(stock.get("Patties"), bd(120), bd(1.20));
        ordered.setNote("Restock before the weekend");
        ordered.setStatus(PurchaseOrderStatus.ORDERED);
        ordered.setCreatedAt(now.minusDays(1));
        ordered.setOrderedAt(now.minusDays(1));
        ordered.setExpectedAt(LocalDate.now().plusDays(1));
        orders.save(ordered);

        final PurchaseOrder draft = new PurchaseOrder(supplierMap.get("Vers & Co"), sara);
        draft.addLine(stock.get("Lettuce"), bd(30), bd(0.90));
        draft.setNote("Add anything else that runs low before Thursday");
        draft.setCreatedAt(now.minusHours(5));
        draft.setExpectedAt(LocalDate.now().plusDays(2));
        orders.save(draft);

        final PurchaseOrder cancelled = new PurchaseOrder(supplierMap.get("Leuven Drinks"), sara);
        cancelled.addLine(stock.get("Cola"), bd(96), bd(0.55));
        cancelled.setNote("Duplicate of the standing order");
        cancelled.setStatus(PurchaseOrderStatus.CANCELLED);
        cancelled.setCreatedAt(now.minusDays(15));
        orders.save(cancelled);
    }

    // ------------------------------------------------------------------ availability and schedule

    /** Each employee's usual week: the days they can work and, optionally, the hours. */
    private Map<DayOfWeek, AvailabilityStatus> pattern(String username) {
        final Map<DayOfWeek, AvailabilityStatus> week = new LinkedHashMap<>();
        for (DayOfWeek day : DayOfWeek.values()) week.put(day, AvailabilityStatus.AVAILABLE);
        switch (username) {
            case "lina" -> { week.put(DayOfWeek.MONDAY, AvailabilityStatus.UNAVAILABLE); week.put(DayOfWeek.TUESDAY, AvailabilityStatus.UNAVAILABLE); week.put(DayOfWeek.SATURDAY, AvailabilityStatus.PREFERRED); }
            case "youssef" -> { week.put(DayOfWeek.SUNDAY, AvailabilityStatus.UNAVAILABLE); week.put(DayOfWeek.FRIDAY, AvailabilityStatus.PREFERRED); }
            case "emma" -> { week.put(DayOfWeek.MONDAY, AvailabilityStatus.UNAVAILABLE); week.put(DayOfWeek.WEDNESDAY, AvailabilityStatus.UNAVAILABLE); week.put(DayOfWeek.THURSDAY, AvailabilityStatus.UNAVAILABLE); }
            case "noah" -> week.put(DayOfWeek.WEDNESDAY, AvailabilityStatus.UNAVAILABLE);
            case "mila" -> { week.put(DayOfWeek.SUNDAY, AvailabilityStatus.UNAVAILABLE); week.put(DayOfWeek.TUESDAY, AvailabilityStatus.PREFERRED); }
            case "lucas" -> { week.put(DayOfWeek.SATURDAY, AvailabilityStatus.UNAVAILABLE); week.put(DayOfWeek.SUNDAY, AvailabilityStatus.UNAVAILABLE); }
            case "nora" -> { week.put(DayOfWeek.MONDAY, AvailabilityStatus.UNAVAILABLE); week.put(DayOfWeek.FRIDAY, AvailabilityStatus.PREFERRED); }
            default -> week.put(DayOfWeek.THURSDAY, AvailabilityStatus.PREFERRED);
        }
        return week;
    }

    /** Students only work evenings on weekdays. */
    private static LocalTime[] window(String username, DayOfWeek day) {
        final boolean weekday = day.getValue() <= 5;
        return switch (username) {
            case "emma", "lucas" -> weekday ? new LocalTime[]{LocalTime.of(16, 0), LocalTime.of(23, 30)} : null;
            case "lina" -> weekday ? new LocalTime[]{LocalTime.of(11, 0), LocalTime.of(23, 30)} : null;
            default -> null;
        };
    }

    private void seedAvailability(Map<String, User> team) {
        final LocalDate start = LocalDate.now().with(DayOfWeek.MONDAY).minusWeeks(1);
        final List<String> employees = team.values().stream().filter(u -> u.getRole() == Role.EMPLOYEE).map(User::getUsername).toList();
        final Map<String, LocalDate> exceptions = Map.of(
                "hunein", LocalDate.now().with(DayOfWeek.MONDAY).plusWeeks(1).plusDays(2),
                "noah", LocalDate.now().with(DayOfWeek.MONDAY).plusWeeks(1).plusDays(4),
                "mila", LocalDate.now().with(DayOfWeek.MONDAY).plusWeeks(2));
        for (String username : employees) {
            final User user = team.get(username);
            // Nora started recently and has only filled in the next two weeks; everyone else has five.
            final int weeks = username.equals("nora") ? 3 : 6;
            final Map<DayOfWeek, AvailabilityStatus> week = pattern(username);
            for (LocalDate date = start; date.isBefore(start.plusWeeks(weeks)); date = date.plusDays(1)) {
                final Availability entry = new Availability(user, date);
                AvailabilityStatus status = week.get(date.getDayOfWeek());
                String note = null;
                if (date.equals(exceptions.get(username))) {
                    status = AvailabilityStatus.UNAVAILABLE;
                    note = switch (username) {
                        case "hunein" -> "Exam at university";
                        case "noah" -> "Doctor's appointment";
                        default -> "Family visit";
                    };
                }
                final LocalTime[] hours = status == AvailabilityStatus.UNAVAILABLE ? null : window(username, date.getDayOfWeek());
                entry.update(status, hours == null ? null : hours[0], hours == null ? null : hours[1], note);
                availability.save(entry);
            }
        }
    }

    /**
     * Last week and this week are published, next week is a draft with its availability locked and a
     * few deliberate problems to resolve, and the week after is still open.
     */
    private void seedSchedule(Map<String, User> team, List<ShiftType> types) {
        final LocalDate thisWeek = LocalDate.now().with(DayOfWeek.MONDAY);
        final User sara = team.get("sara");
        final Map<String, ShiftType> byName = new HashMap<>();
        types.forEach(t -> byName.put(t.getName(), t));

        final SchedulePeriod last = planWeek(thisWeek.minusWeeks(1), team, byName, sara, true);
        last.setPublishedAt(thisWeek.minusWeeks(2).plusDays(4).atTime(16, 0));
        final SchedulePeriod current = planWeek(thisWeek, team, byName, sara, true);
        current.setPublishedAt(thisWeek.minusDays(3).atTime(15, 30));
        final SchedulePeriod next = planWeek(thisWeek.plusWeeks(1), team, byName, sara, false);
        next.setAvailabilityLocked(true);

        // A change made after publishing, so the change log has something in it.
        final List<Shift> currentShifts = shifts.findByPeriodId(current.getId());
        currentShifts.stream().filter(s -> !s.getDate().isBefore(LocalDate.now())).findFirst().ifPresent(shift -> {
            final ShiftChange change = new ShiftChange(current, shift.getUser(), sara, ShiftChangeType.MODIFIED,
                    "Moved " + shift.getUser().getName() + "'s start time to " + shift.getStartTime() + " after a swap request.");
            changes.save(change);
        });

        // A deliberate conflict in next week's draft: Hunein on the day of his exam.
        final LocalDate examDay = thisWeek.plusWeeks(1).plusDays(2);
        final User hunein = team.get("hunein");
        if (shifts.findForUserBetween(hunein.getId(), examDay, examDay).isEmpty()) {
            final ShiftType evening = byName.get("Evening");
            shifts.save(new Shift(next, hunein, evening, examDay, evening.getStartTime(), evening.getEndTime(), null, sara));
        }
    }

    private SchedulePeriod planWeek(LocalDate weekStart, Map<String, User> team, Map<String, ShiftType> types,
                                    User planner, boolean publish) {
        final SchedulePeriod period = periods.findByWeekStart(weekStart).orElseGet(() -> periods.save(new SchedulePeriod(weekStart)));
        if (publish) {
            period.setStatus(PeriodStatus.PUBLISHED);
            period.setPublishedBy(planner);
            period.setAvailabilityLocked(true);
        }
        final List<User> employees = team.values().stream().filter(u -> u.getRole() == Role.EMPLOYEE).toList();
        final Map<Long, Double> hours = new HashMap<>();
        int rotation = (int) (weekStart.toEpochDay() % employees.size());

        for (int offset = 0; offset < 7; offset++) {
            final LocalDate date = weekStart.plusDays(offset);
            final boolean weekend = date.getDayOfWeek() == DayOfWeek.FRIDAY || date.getDayOfWeek() == DayOfWeek.SATURDAY;
            final List<ShiftType> today = types.values().stream()
                    .filter(type -> type.isActive() && type.runsOn(date.getDayOfWeek()))
                    .sorted(java.util.Comparator.comparing(ShiftType::getStartTime)).toList();
            final Map<Long, List<Shift>> booked = new HashMap<>();

            for (ShiftType type : today) {
                // Next week's draft is left one person short on Sunday evening, so the board shows a gap.
                int needed = type.getMinStaff() + (weekend && type.getName().equals("Evening") ? 1 : 0);
                if (!publish && date.getDayOfWeek() == DayOfWeek.SUNDAY && type.getName().equals("Evening")) needed -= 1;
                for (int i = 0; i < employees.size() && needed > 0; i++) {
                    final User candidate = employees.get((rotation + i) % employees.size());
                    final Shift shift = new Shift(period, candidate, type, date, type.getStartTime(), type.getEndTime(), null, planner);
                    if (!fits(candidate, shift, booked, hours)) continue;
                    shifts.save(shift);
                    booked.computeIfAbsent(candidate.getId(), k -> new ArrayList<>()).add(shift);
                    hours.merge(candidate.getId(), shift.getHours(), Double::sum);
                    needed--;
                }
                rotation = (rotation + 2) % employees.size();
            }
        }
        return period;
    }

    private boolean fits(User user, Shift shift, Map<Long, List<Shift>> booked, Map<Long, Double> hours) {
        if (booked.getOrDefault(user.getId(), List.of()).stream().anyMatch(shift::overlaps)) return false;
        if (booked.getOrDefault(user.getId(), List.of()).size() >= 1) return false;
        if (hours.getOrDefault(user.getId(), 0.0) + shift.getHours() > user.getMaxWeeklyHours()) return false;
        return availability.findByUserIdAndDate(user.getId(), shift.getDate()).map(day -> {
            if (day.getStatus() == AvailabilityStatus.UNAVAILABLE) return false;
            if (day.getStartTime() == null) return true;
            final int from = day.getStartTime().toSecondOfDay() / 60;
            final int to = day.getEndTime().toSecondOfDay() / 60;
            return shift.startMinute() >= from && shift.endMinute() <= to;
        }).orElse(false);
    }

    // ------------------------------------------------------------------ notifications

    private void seedNotifications(Map<String, User> team, Map<String, StockItem> stock) {
        final LocalDate thisWeek = LocalDate.now().with(DayOfWeek.MONDAY);
        final LocalDateTime published = thisWeek.minusDays(3).atTime(15, 30);
        final Set<User> scheduled = new java.util.LinkedHashSet<>();
        shifts.findBetween(thisWeek, thisWeek.plusDays(6)).forEach(s -> scheduled.add(s.getUser()));
        for (User employee : scheduled) {
            note(employee, NotificationType.SCHEDULE_PUBLISHED, "New schedule published",
                    "Sara Peeters published the schedule for the week of " + java.time.format.DateTimeFormatter.ofPattern("EEE d MMM", Locale.ENGLISH).format(thisWeek) + ".",
                    "{\"week\":\"" + thisWeek + "\",\"by\":\"Sara Peeters\"}", "/schedule/my?week=" + thisWeek,
                    published, employee.getUsername().equals("hunein"));
        }

        final User nora = team.get("nora");
        note(nora, NotificationType.ACCOUNT_CREATED, "Welcome to the team",
                "Tom Willems created your account. Check your profile and add your availability.",
                "{\"by\":\"Tom Willems\",\"role\":\"EMPLOYEE\"}", "/profile", LocalDateTime.now().minusDays(20), true);

        final LocalDate nextWeek = thisWeek.plusWeeks(1);
        for (String manager : List.of("sara", "tom")) {
            final User recipient = team.get(manager);
            final String name = manager.equals("sara") ? "Lina Janssens" : "Mila Wouters";
            final User about = team.get(manager.equals("sara") ? "lina" : "mila");
            note(recipient, NotificationType.AVAILABILITY_SUBMITTED, "Availability updated",
                    name + " updated their availability for the coming weeks.",
                    "{\"name\":\"" + name + "\",\"from\":\"" + nextWeek + "\",\"to\":\"" + nextWeek.plusDays(27) + "\",\"days\":28}",
                    "/schedule/planning?week=" + nextWeek + "&employee=" + about.getId(), LocalDateTime.now().minusHours(20), false);
        }

        final List<User> management = List.of(team.get("angelo"), team.get("sara"), team.get("tom"));
        for (StockItem item : stock.values()) {
            if (!item.isLow()) continue;
            final String quantity = item.getQuantity().stripTrailingZeros().toPlainString();
            final String threshold = item.getMinThreshold().stripTrailingZeros().toPlainString();
            for (User recipient : management) {
                note(recipient, NotificationType.LOW_STOCK, "Low stock: " + item.getName(),
                        item.getName() + " is down to " + quantity + " " + item.getUnit().label()
                                + ", below its minimum of " + threshold + ".",
                        "{\"item\":\"" + item.getName() + "\",\"quantity\":\"" + quantity + "\",\"threshold\":\"" + threshold
                                + "\",\"unit\":\"" + item.getUnit().name() + "\"}",
                        "/stock?item=" + item.getId(), LocalDateTime.now().minusHours(2), false);
            }
        }

        orders.findAllByOrderByCreatedAtDesc().stream().filter(o -> o.getStatus() == PurchaseOrderStatus.RECEIVED).findFirst()
                .ifPresent(order -> management.forEach(recipient -> note(recipient, NotificationType.PURCHASE_ORDER_RECEIVED,
                        "Order PO-" + order.getId() + " received",
                        "Tom Willems received order PO-" + order.getId() + " from " + order.getSupplier().getName() + ". "
                                + order.getLines().size() + " items were added to stock.",
                        "{\"order\":" + order.getId() + ",\"supplier\":\"" + order.getSupplier().getName()
                                + "\",\"by\":\"Tom Willems\",\"lines\":" + order.getLines().size() + "}",
                        "/stock/orders/" + order.getId(), order.getReceivedAt(), true)));
    }

    private void note(User user, NotificationType type, String title, String message, String params, String link,
                      LocalDateTime at, boolean read) {
        final Notification notification = new Notification(user, type, title, message, params, link);
        notification.setCreatedAt(at);
        if (read) notification.setReadAt(at.plusHours(1));
        notifications.save(notification);
    }

    // ------------------------------------------------------------------ numbers

    private static BigDecimal bd(double value) {
        return BigDecimal.valueOf(value).setScale(3, RoundingMode.HALF_UP);
    }

    private static double round(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
