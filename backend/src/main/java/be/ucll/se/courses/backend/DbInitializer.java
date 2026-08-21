package be.ucll.se.courses.backend;

import be.ucll.se.courses.backend.enums.Day;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.enums.Shift;
import be.ucll.se.courses.backend.model.Notification;
import be.ucll.se.courses.backend.model.ScheduleItem;
import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.NotificationRepository;
import be.ucll.se.courses.backend.repository.ScheduleItemRepository;
import be.ucll.se.courses.backend.repository.StockItemRepository;
import be.ucll.se.courses.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class DbInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DbInitializer.class);

    private final UserRepository userRepository;
    private final StockItemRepository stockItemRepository;
    private final ScheduleItemRepository scheduleItemRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DbInitializer(UserRepository userRepository,
                         StockItemRepository stockItemRepository,
                         ScheduleItemRepository scheduleItemRepository,
                         NotificationRepository notificationRepository,
                         PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.stockItemRepository = stockItemRepository;
        this.scheduleItemRepository = scheduleItemRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            log.info("Database already contains data, skipping seed");
            return;
        }

        final User admin = userRepository.save(
                new User("Angelo", "angelo", passwordEncoder.encode("angelo123"), Role.ADMIN));
        final User employee = userRepository.save(
                new User("Hunein", "hunein", passwordEncoder.encode("hunein123"), Role.EMPLOYEE));

        stockItemRepository.saveAll(List.of(
                new StockItem("Nuggets", 12),
                new StockItem("Tenders", 15),
                new StockItem("Falafel", 17),
                new StockItem("Fries", 30),
                new StockItem("Meat", 20),
                new StockItem("Hot dogs", 30),
                new StockItem("Patties", 25),
                new StockItem("Buns", 15),
                new StockItem("Sauce", 17),
                new StockItem("Cola", 33)));

        scheduleItemRepository.saveAll(List.of(
                new ScheduleItem(Day.MONDAY, Shift.MORNING, admin),
                new ScheduleItem(Day.MONDAY, Shift.EVENING, employee),
                new ScheduleItem(Day.TUESDAY, Shift.MORNING, employee),
                new ScheduleItem(Day.TUESDAY, Shift.EVENING, admin),
                new ScheduleItem(Day.WEDNESDAY, Shift.MORNING, null),
                new ScheduleItem(Day.WEDNESDAY, Shift.EVENING, null),
                new ScheduleItem(Day.THURSDAY, Shift.MORNING, admin),
                new ScheduleItem(Day.THURSDAY, Shift.EVENING, null),
                new ScheduleItem(Day.FRIDAY, Shift.MORNING, admin),
                new ScheduleItem(Day.FRIDAY, Shift.EVENING, employee),
                new ScheduleItem(Day.SATURDAY, Shift.MORNING, employee),
                new ScheduleItem(Day.SATURDAY, Shift.EVENING, admin),
                new ScheduleItem(Day.SUNDAY, Shift.MORNING, null),
                new ScheduleItem(Day.SUNDAY, Shift.EVENING, null)));

        notificationRepository.saveAll(List.of(
                new Notification("Welcome to your account.", LocalDateTime.now(), null, admin),
                new Notification("Welcome to your account.", LocalDateTime.now(), null, employee)));

        log.info("Database seeded with {} users, {} stock items, {} schedule items and {} notifications",
                userRepository.count(),
                stockItemRepository.count(),
                scheduleItemRepository.count(),
                notificationRepository.count());
    }
}
