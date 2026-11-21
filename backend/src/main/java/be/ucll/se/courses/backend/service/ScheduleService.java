package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.ScheduleDtos.MyScheduleResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.PeriodResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.PlanningEmployee;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.PlanningResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.PlanningWarning;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftChangeResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftRequest;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftTypeResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.WeekSummary;
import be.ucll.se.courses.backend.enums.AvailabilityStatus;
import be.ucll.se.courses.backend.enums.PeriodStatus;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.enums.ShiftChangeType;
import be.ucll.se.courses.backend.events.DomainEvents;
import be.ucll.se.courses.backend.exception.BusinessRuleException;
import be.ucll.se.courses.backend.model.Availability;
import be.ucll.se.courses.backend.model.SchedulePeriod;
import be.ucll.se.courses.backend.model.Shift;
import be.ucll.se.courses.backend.model.ShiftChange;
import be.ucll.se.courses.backend.model.ShiftType;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.AvailabilityRepository;
import be.ucll.se.courses.backend.repository.SchedulePeriodRepository;
import be.ucll.se.courses.backend.repository.ShiftChangeRepository;
import be.ucll.se.courses.backend.repository.ShiftRepository;
import be.ucll.se.courses.backend.repository.ShiftTypeRepository;
import be.ucll.se.courses.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Shift planning. Managers build a week as a DRAFT, see conflicts as they go, and publish it. From
 * then on employees can see it, and every change is logged and sent to the people it affects.
 */
@Service
@Transactional
public class ScheduleService {

    private final ShiftRepository shiftRepository;
    private final SchedulePeriodRepository periodRepository;
    private final ShiftTypeRepository shiftTypeRepository;
    private final ShiftChangeRepository changeRepository;
    private final AvailabilityRepository availabilityRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final ApplicationEventPublisher events;

    public ScheduleService(ShiftRepository shiftRepository,
                           SchedulePeriodRepository periodRepository,
                           ShiftTypeRepository shiftTypeRepository,
                           ShiftChangeRepository changeRepository,
                           AvailabilityRepository availabilityRepository,
                           UserRepository userRepository,
                           CurrentUserService currentUserService,
                           ApplicationEventPublisher events) {
        this.shiftRepository = shiftRepository;
        this.periodRepository = periodRepository;
        this.shiftTypeRepository = shiftTypeRepository;
        this.changeRepository = changeRepository;
        this.availabilityRepository = availabilityRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.events = events;
    }

    // ------------------------------------------------------------------ planning board

    /** Everything the planning grid needs for whole weeks covering {@code from} to {@code to}. */
    @Transactional(readOnly = true)
    public PlanningResponse planning(LocalDate from, LocalDate to) {
        AvailabilityService.checkedRange(from, to, 45);
        final LocalDate start = ScheduleMapper.weekStart(from);
        final LocalDate end = ScheduleMapper.weekStart(to).plusDays(6);

        final List<User> employees = userRepository.findActiveEmployees();
        final List<Shift> shifts = shiftRepository.findBetween(start, end);
        final List<Availability> availability = availabilityRepository.findForActiveUsersBetween(start, end);
        final List<ShiftType> types = shiftTypeRepository.findAllByOrderByStartTime();

        final Map<LocalDate, List<Shift>> shiftsByWeek = shifts.stream()
                .collect(Collectors.groupingBy(s -> ScheduleMapper.weekStart(s.getDate()), TreeMap::new, Collectors.toList()));

        final List<PlanningEmployee> planningEmployees = employees.stream().map(employee -> {
            final Map<LocalDate, Double> hours = new LinkedHashMap<>();
            for (LocalDate week = start; !week.isAfter(end); week = week.plusWeeks(1)) {
                hours.put(week, sumHours(shiftsByWeek.getOrDefault(week, List.of()), employee.getId()));
            }
            return new PlanningEmployee(employee.getId(), employee.getName(), employee.getPosition(),
                    employee.getMaxWeeklyHours(), hours);
        }).toList();

        final List<ShiftTypeResponse> typeResponses = types.stream()
                .filter(type -> type.isActive() || shifts.stream().anyMatch(s -> s.getShiftType() != null && s.getShiftType().getId().equals(type.getId())))
                .map(ScheduleMapper::toTypeResponse).toList();

        return new PlanningResponse(start, end, planningEmployees, typeResponses,
                shifts.stream().map(ScheduleMapper::toShiftResponse).toList(),
                availability.stream().map(ScheduleMapper::toAvailabilityResponse).toList(),
                periods(start, end),
                warnings(start, end, employees, shifts, availability, types));
    }

    /** Status of every week in the range, including weeks nobody has started planning yet. */
    @Transactional(readOnly = true)
    public List<PeriodResponse> periods(LocalDate from, LocalDate to) {
        final LocalDate start = ScheduleMapper.weekStart(from);
        final Map<LocalDate, SchedulePeriod> existing = periodRepository.findByWeekStartBetweenOrderByWeekStart(start, to)
                .stream().collect(Collectors.toMap(SchedulePeriod::getWeekStart, Function.identity()));
        final List<PeriodResponse> result = new ArrayList<>();
        for (LocalDate week = start; !week.isAfter(to); week = week.plusWeeks(1)) {
            final SchedulePeriod period = existing.get(week);
            if (period == null) {
                result.add(new PeriodResponse(week, week.plusDays(6), PeriodStatus.DRAFT, false, null, null, 0, 0));
            } else {
                result.add(ScheduleMapper.toPeriodResponse(period, shiftRepository.findByPeriodId(period.getId()).size(),
                        changeRepository.findByPeriodIdOrderByChangedAtDesc(period.getId()).size()));
            }
        }
        return result;
    }

    // ------------------------------------------------------------------ assigning

    public ShiftResponse assign(ShiftRequest request) {
        final User actor = currentUserService.get();
        final User employee = findSchedulableEmployee(request.userId());
        requireNotPast(request.date(), "Shifts in the past can no longer be planned.");
        final ShiftType type = request.shiftTypeId() == null ? null : findType(request.shiftTypeId());
        final LocalTime[] times = resolveTimes(type, request.startTime(), request.endTime());
        final SchedulePeriod period = periodFor(request.date());

        final Shift shift = new Shift(period, employee, type, request.date(), times[0], times[1], clean(request.note()), actor);
        checkConflicts(shift, null, request.force());
        shiftRepository.save(shift);

        if (period.isPublished()) {
            record(period, employee, actor, ShiftChangeType.ASSIGNED, request.date(),
                    "Added " + employee.getName() + " to " + ScheduleMapper.describe(shift) + ".",
                    "You were added to a shift on " + ScheduleMapper.describe(shift) + ".");
        }
        return ScheduleMapper.toShiftResponse(shift);
    }

    /** Moves a shift to another person, day or time. Dragging on the board ends up here. */
    public ShiftResponse update(Long id, ShiftRequest request) {
        final User actor = currentUserService.get();
        final Shift shift = findShift(id);
        requireNotPast(shift.getDate(), "Shifts in the past can no longer be changed.");
        requireNotPast(request.date(), "Shifts cannot be moved into the past.");

        final User previousUser = shift.getUser();
        final SchedulePeriod previousPeriod = shift.getPeriod();
        final String previousDescription = ScheduleMapper.describe(shift);
        final LocalDate previousDate = shift.getDate();

        final User employee = findSchedulableEmployee(request.userId());
        final ShiftType type = request.shiftTypeId() == null ? null : findType(request.shiftTypeId());
        final LocalTime[] times = resolveTimes(type, request.startTime(), request.endTime());
        final SchedulePeriod period = periodFor(request.date());

        final Shift candidate = new Shift(period, employee, type, request.date(), times[0], times[1], null, actor);
        checkConflicts(candidate, shift.getId(), request.force());
        shift.reschedule(period, employee, type, request.date(), times[0], times[1], clean(request.note()));
        final String newDescription = ScheduleMapper.describe(shift);

        if (previousUser.getId().equals(employee.getId())) {
            if (!previousDescription.equals(newDescription) && (previousPeriod.isPublished() || period.isPublished())) {
                record(period.isPublished() ? period : previousPeriod, employee, actor, ShiftChangeType.MODIFIED, request.date(),
                        "Moved " + employee.getName() + " from " + previousDescription + " to " + newDescription + ".",
                        "Your shift on " + previousDescription + " is now on " + newDescription + ".");
            }
        } else {
            if (previousPeriod.isPublished()) {
                record(previousPeriod, previousUser, actor, ShiftChangeType.REMOVED, previousDate,
                        "Took " + previousUser.getName() + " off " + previousDescription + " and gave it to " + employee.getName() + ".",
                        "You were taken off your shift on " + previousDescription + ".");
            }
            if (period.isPublished()) {
                record(period, employee, actor, ShiftChangeType.ASSIGNED, request.date(),
                        "Added " + employee.getName() + " to " + newDescription + ".",
                        "You were added to a shift on " + newDescription + ".");
            }
        }
        return ScheduleMapper.toShiftResponse(shift);
    }

    public void delete(Long id) {
        final User actor = currentUserService.get();
        final Shift shift = findShift(id);
        requireNotPast(shift.getDate(), "Shifts in the past can no longer be changed.");
        if (shift.getPeriod().isPublished()) {
            record(shift.getPeriod(), shift.getUser(), actor, ShiftChangeType.REMOVED, shift.getDate(),
                    "Cancelled " + shift.getUser().getName() + "'s shift on " + ScheduleMapper.describe(shift) + ".",
                    "Your shift on " + ScheduleMapper.describe(shift) + " was cancelled.");
        }
        shiftRepository.delete(shift);
    }

    // ------------------------------------------------------------------ week lifecycle

    public PeriodResponse publish(LocalDate weekStart) {
        final User actor = currentUserService.get();
        final SchedulePeriod period = periodFor(requireMonday(weekStart));
        if (period.isPublished()) {
            throw new BusinessRuleException("ALREADY_PUBLISHED", "This week is already published. Changes you make are sent to the people involved.");
        }
        final List<Shift> shifts = shiftRepository.findByPeriodId(period.getId());
        if (shifts.isEmpty()) {
            throw new BusinessRuleException("EMPTY_WEEK", "There are no shifts in this week yet, so there is nothing to publish.");
        }
        period.setStatus(PeriodStatus.PUBLISHED);
        period.setPublishedAt(LocalDateTime.now());
        period.setPublishedBy(actor);
        // Availability can no longer shape a published week, so lock it as well.
        period.setAvailabilityLocked(true);

        final Set<User> employees = shifts.stream().map(Shift::getUser)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        events.publishEvent(new DomainEvents.SchedulePublished(period, employees, actor));
        return ScheduleMapper.toPeriodResponse(period, shifts.size(), 0);
    }

    public PeriodResponse setAvailabilityLock(LocalDate weekStart, boolean locked) {
        final SchedulePeriod period = periodFor(requireMonday(weekStart));
        if (!locked && period.isPublished()) {
            throw new BusinessRuleException("PUBLISHED_WEEK", "A published week stays locked.");
        }
        period.setAvailabilityLocked(locked);
        return ScheduleMapper.toPeriodResponse(period, shiftRepository.findByPeriodId(period.getId()).size(),
                changeRepository.findByPeriodIdOrderByChangedAtDesc(period.getId()).size());
    }

    @Transactional(readOnly = true)
    public List<ShiftChangeResponse> changes(LocalDate weekStart) {
        return periodRepository.findByWeekStart(requireMonday(weekStart))
                .map(period -> changeRepository.findByPeriodIdOrderByChangedAtDesc(period.getId()).stream()
                        .map(change -> new ShiftChangeResponse(change.getId(), change.getChangeType(), change.getDescription(),
                                change.getAffectedUser() == null ? null : change.getAffectedUser().getName(),
                                change.getChangedBy() == null ? null : change.getChangedBy().getName(),
                                change.getChangedAt()))
                        .toList())
                .orElse(List.of());
    }

    // ------------------------------------------------------------------ employee views

    /** The signed-in employee's own shifts. Drafts stay hidden until published. */
    @Transactional(readOnly = true)
    public MyScheduleResponse mine(LocalDate from, LocalDate to) {
        return scheduleFor(currentUserService.get(), from, to, true);
    }

    @Transactional(readOnly = true)
    public MyScheduleResponse forUser(Long userId, LocalDate from, LocalDate to) {
        final User user = userRepository.findById(userId).orElseThrow(() -> new EntityNotFoundException("User not found."));
        return scheduleFor(user, from, to, false);
    }

    @Transactional(readOnly = true)
    public List<ShiftResponse> upcoming(User user, boolean publishedOnly, int days) {
        final LocalDate today = LocalDate.now();
        final List<Shift> shifts = publishedOnly
                ? shiftRepository.findForUserBetweenWithStatus(user.getId(), today, today.plusDays(days), PeriodStatus.PUBLISHED)
                : shiftRepository.findForUserBetween(user.getId(), today, today.plusDays(days));
        return shifts.stream().map(ScheduleMapper::toShiftResponse).toList();
    }

    @Transactional(readOnly = true)
    public double hoursThisWeek(User user, boolean publishedOnly) {
        final LocalDate start = ScheduleMapper.weekStart(LocalDate.now());
        final List<Shift> shifts = publishedOnly
                ? shiftRepository.findForUserBetweenWithStatus(user.getId(), start, start.plusDays(6), PeriodStatus.PUBLISHED)
                : shiftRepository.findForUserBetween(user.getId(), start, start.plusDays(6));
        return shifts.stream().mapToDouble(Shift::getHours).sum();
    }

    /** Called when someone is deactivated: their future shifts go, and published weeks log it. */
    public void removeFutureShifts(User user, User actor) {
        final LocalDate today = LocalDate.now();
        for (Shift shift : shiftRepository.findForUserBetween(user.getId(), today, today.plusYears(1))) {
            if (shift.getPeriod().isPublished()) {
                changeRepository.save(new ShiftChange(shift.getPeriod(), user, actor, ShiftChangeType.REMOVED,
                        user.getName() + " was removed from " + ScheduleMapper.describe(shift) + " because their account was deactivated."));
            }
            shiftRepository.delete(shift);
        }
    }

    // ------------------------------------------------------------------ rules

    private void checkConflicts(Shift candidate, Long ignoreShiftId, boolean force) {
        final User employee = candidate.getUser();
        final LocalDate weekStart = ScheduleMapper.weekStart(candidate.getDate());
        final List<Shift> week = shiftRepository.findForUserBetween(employee.getId(), weekStart, weekStart.plusDays(6)).stream()
                .filter(s -> !s.getId().equals(ignoreShiftId)).toList();

        week.stream().filter(candidate::overlaps).findFirst().ifPresent(clash -> {
            throw new BusinessRuleException("SHIFT_DOUBLE_BOOKED",
                    employee.getName() + " already works " + ScheduleMapper.describe(clash) + ", which overlaps this shift.");
        });

        if (force) {
            return;
        }
        final List<String> warnings = new ArrayList<>();
        availabilityRepository.findByUserIdAndDate(employee.getId(), candidate.getDate()).ifPresentOrElse(availability -> {
            final String problem = availabilityProblem(availability, candidate);
            if (problem != null) {
                warnings.add(problem);
            }
        }, () -> warnings.add(employee.getName() + " has not entered availability for " + ScheduleMapper.DAY.format(candidate.getDate()) + "."));

        final double hours = week.stream().mapToDouble(Shift::getHours).sum() + candidate.getHours();
        if (hours > employee.getMaxWeeklyHours()) {
            warnings.add("This brings " + employee.getName() + " to " + formatHours(hours) + " this week, above their maximum of "
                    + employee.getMaxWeeklyHours() + " h.");
        }
        if (!warnings.isEmpty()) {
            throw new BusinessRuleException("SHIFT_WARNINGS", "Check this assignment before saving it.", warnings);
        }
    }

    private static String availabilityProblem(Availability availability, Shift shift) {
        final String name = shift.getUser().getName();
        final String day = ScheduleMapper.DAY.format(shift.getDate());
        if (availability.getStatus() == AvailabilityStatus.UNAVAILABLE) {
            return name + " marked " + day + " as unavailable" + (availability.getNote() == null ? "." : ": \"" + availability.getNote() + "\".");
        }
        if (availability.getStartTime() != null && availability.getEndTime() != null) {
            final int from = availability.getStartTime().toSecondOfDay() / 60;
            final int to = availability.getEndTime().toSecondOfDay() / 60;
            if (shift.startMinute() < from || shift.endMinute() > to) {
                return name + " is only available " + ScheduleMapper.TIME.format(availability.getStartTime()) + " to "
                        + ScheduleMapper.TIME.format(availability.getEndTime()) + " on " + day + ".";
            }
        }
        return null;
    }

    /** Problems on the board, worst first: unavailable people, double bookings, overtime, then gaps. */
    private List<PlanningWarning> warnings(LocalDate start, LocalDate end, List<User> employees, List<Shift> shifts,
                                           List<Availability> availability, List<ShiftType> types) {
        final List<PlanningWarning> warnings = new ArrayList<>();
        final Map<String, Availability> availabilityByKey = availability.stream()
                .collect(Collectors.toMap(a -> a.getUser().getId() + "|" + a.getDate(), Function.identity(), (a, b) -> a));

        for (Shift shift : shifts) {
            final Availability day = availabilityByKey.get(shift.getUser().getId() + "|" + shift.getDate());
            if (day != null) {
                final String problem = availabilityProblem(day, shift);
                if (problem != null) {
                    warnings.add(new PlanningWarning(day.getStatus() == AvailabilityStatus.UNAVAILABLE ? "UNAVAILABLE" : "OUTSIDE_AVAILABILITY",
                            day.getStatus() == AvailabilityStatus.UNAVAILABLE ? "ERROR" : "WARNING",
                            shift.getDate(), shift.getUser().getId(), shift.getId(), null, problem));
                }
            }
        }

        final Map<Long, List<Shift>> byUser = shifts.stream().collect(Collectors.groupingBy(s -> s.getUser().getId()));
        byUser.forEach((userId, userShifts) -> {
            for (int i = 0; i < userShifts.size(); i++) {
                for (int j = i + 1; j < userShifts.size(); j++) {
                    final Shift a = userShifts.get(i);
                    final Shift b = userShifts.get(j);
                    if (a.overlaps(b)) {
                        warnings.add(new PlanningWarning("DOUBLE_BOOKED", "ERROR", a.getDate(), userId, b.getId(), null,
                                a.getUser().getName() + " is booked twice on " + ScheduleMapper.DAY.format(a.getDate()) + "."));
                    }
                }
            }
        });

        for (User employee : employees) {
            for (LocalDate week = start; !week.isAfter(end); week = week.plusWeeks(1)) {
                final LocalDate weekStart = week;
                final double hours = byUser.getOrDefault(employee.getId(), List.of()).stream()
                        .filter(s -> ScheduleMapper.weekStart(s.getDate()).equals(weekStart))
                        .mapToDouble(Shift::getHours).sum();
                if (hours > employee.getMaxWeeklyHours()) {
                    warnings.add(new PlanningWarning("OVER_HOURS", "WARNING", weekStart, employee.getId(), null, null,
                            employee.getName() + " works " + formatHours(hours) + " in the week of " + ScheduleMapper.DAY.format(weekStart)
                                    + ", above their maximum of " + employee.getMaxWeeklyHours() + " h."));
                }
            }
        }

        final LocalDate today = LocalDate.now();
        for (ShiftType type : types) {
            if (!type.isActive() || type.getMinStaff() == 0) {
                continue;
            }
            for (LocalDate date = start.isBefore(today) ? today : start; !date.isAfter(end); date = date.plusDays(1)) {
                if (!type.runsOn(date.getDayOfWeek())) {
                    continue;
                }
                final LocalDate day = date;
                final long staffed = shifts.stream()
                        .filter(s -> s.getDate().equals(day) && s.getShiftType() != null && s.getShiftType().getId().equals(type.getId()))
                        .count();
                if (staffed < type.getMinStaff()) {
                    warnings.add(new PlanningWarning("UNDERSTAFFED", "WARNING", day, null, null, type.getId(),
                            type.getName() + " on " + ScheduleMapper.DAY.format(day) + " has " + staffed + " of the "
                                    + type.getMinStaff() + " people it needs."));
                }
            }
        }

        final Map<String, Integer> rank = Map.of("ERROR", 0, "WARNING", 1);
        warnings.sort(Comparator.comparing((PlanningWarning w) -> rank.getOrDefault(w.severity(), 2))
                .thenComparing(PlanningWarning::date));
        return warnings;
    }

    private MyScheduleResponse scheduleFor(User user, LocalDate from, LocalDate to, boolean publishedOnly) {
        AvailabilityService.checkedRange(from, to, 93);
        final LocalDate start = ScheduleMapper.weekStart(from);
        final LocalDate end = ScheduleMapper.weekStart(to).plusDays(6);
        final List<Shift> shifts = publishedOnly
                ? shiftRepository.findForUserBetweenWithStatus(user.getId(), start, end, PeriodStatus.PUBLISHED)
                : shiftRepository.findForUserBetween(user.getId(), start, end);
        final Map<LocalDate, SchedulePeriod> periods = periodRepository.findByWeekStartBetweenOrderByWeekStart(start, end)
                .stream().collect(Collectors.toMap(SchedulePeriod::getWeekStart, Function.identity()));
        final List<WeekSummary> weeks = new ArrayList<>();
        for (LocalDate week = start; !week.isAfter(end); week = week.plusWeeks(1)) {
            final LocalDate weekStart = week;
            final List<Shift> inWeek = shifts.stream().filter(s -> ScheduleMapper.weekStart(s.getDate()).equals(weekStart)).toList();
            final SchedulePeriod period = periods.get(week);
            weeks.add(new WeekSummary(week, inWeek.stream().mapToDouble(Shift::getHours).sum(), inWeek.size(),
                    period != null && period.isPublished()));
        }
        return new MyScheduleResponse(start, end, shifts.stream().map(ScheduleMapper::toShiftResponse).toList(), weeks);
    }

    /**
     * Logs a change to a published week and tells the employee.
     * {@code logEntry} is written for managers, {@code message} for the employee it affects.
     */
    private void record(SchedulePeriod period, User affected, User actor, ShiftChangeType type, LocalDate date,
                        String logEntry, String message) {
        changeRepository.save(new ShiftChange(period, affected, actor, type, logEntry));
        events.publishEvent(new DomainEvents.ShiftChanged(affected, period, type, date, message));
    }

    private SchedulePeriod periodFor(LocalDate date) {
        final LocalDate weekStart = ScheduleMapper.weekStart(date);
        return periodRepository.findByWeekStart(weekStart).orElseGet(() -> periodRepository.save(new SchedulePeriod(weekStart)));
    }

    private User findSchedulableEmployee(Long userId) {
        final User user = userRepository.findById(userId).orElseThrow(() -> new EntityNotFoundException("Employee not found."));
        if (!user.isActive()) {
            throw new BusinessRuleException("INACTIVE_USER", user.getName() + "'s account is deactivated.");
        }
        if (user.getRole() != Role.EMPLOYEE) {
            throw new IllegalArgumentException("Only employees can be scheduled.");
        }
        return user;
    }

    private ShiftType findType(Long id) {
        return shiftTypeRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Shift type not found."));
    }

    private Shift findShift(Long id) {
        return shiftRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Shift not found."));
    }

    private static LocalTime[] resolveTimes(ShiftType type, LocalTime start, LocalTime end) {
        final LocalTime resolvedStart = start != null ? start : type == null ? null : type.getStartTime();
        final LocalTime resolvedEnd = end != null ? end : type == null ? null : type.getEndTime();
        if (resolvedStart == null || resolvedEnd == null) {
            throw new IllegalArgumentException("Pick a shift type, or give a start and an end time.");
        }
        if (resolvedStart.equals(resolvedEnd)) {
            throw new IllegalArgumentException("A shift has to start and end at different times.");
        }
        if (ScheduleMapper.hoursBetween(resolvedStart, resolvedEnd) > 14) {
            throw new IllegalArgumentException("A single shift can be at most 14 hours long.");
        }
        return new LocalTime[]{resolvedStart, resolvedEnd};
    }

    private static void requireNotPast(LocalDate date, String message) {
        if (date.isBefore(LocalDate.now())) {
            throw new BusinessRuleException("PAST_DATE", message);
        }
    }

    private static LocalDate requireMonday(LocalDate weekStart) {
        if (weekStart.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Weeks start on a Monday.");
        }
        return weekStart;
    }

    private static double sumHours(List<Shift> shifts, Long userId) {
        return shifts.stream().filter(s -> Objects.equals(s.getUser().getId(), userId)).mapToDouble(Shift::getHours).sum();
    }

    private static String formatHours(double hours) {
        return (hours == Math.floor(hours) ? String.valueOf((int) hours) : String.format(java.util.Locale.ENGLISH, "%.1f", hours)) + " h";
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
