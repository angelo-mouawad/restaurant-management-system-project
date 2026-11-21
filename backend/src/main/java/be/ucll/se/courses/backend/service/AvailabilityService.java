package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.ScheduleDtos.AvailabilityEntry;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.AvailabilityResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.BulkResult;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.CopyWeekRequest;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.MyAvailabilityResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.RecurringAvailabilityRequest;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.RecurringDay;
import be.ucll.se.courses.backend.enums.AvailabilityStatus;
import be.ucll.se.courses.backend.events.DomainEvents;
import be.ucll.se.courses.backend.model.Availability;
import be.ucll.se.courses.backend.model.SchedulePeriod;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.AvailabilityRepository;
import be.ucll.se.courses.backend.repository.SchedulePeriodRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Employees tell the restaurant when they can work. They can edit any future day until a manager
 * locks that week for planning.
 */
@Service
@Transactional
public class AvailabilityService {

    /** How far ahead availability can be entered. */
    static final int MAX_DAYS_AHEAD = 190;

    private final AvailabilityRepository availabilityRepository;
    private final SchedulePeriodRepository periodRepository;
    private final CurrentUserService currentUserService;
    private final ApplicationEventPublisher events;

    public AvailabilityService(AvailabilityRepository availabilityRepository,
                               SchedulePeriodRepository periodRepository,
                               CurrentUserService currentUserService,
                               ApplicationEventPublisher events) {
        this.availabilityRepository = availabilityRepository;
        this.periodRepository = periodRepository;
        this.currentUserService = currentUserService;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public MyAvailabilityResponse mine(LocalDate from, LocalDate to) {
        final LocalDate[] range = checkedRange(from, to, 62);
        final User me = currentUserService.get();
        final List<AvailabilityResponse> entries = availabilityRepository
                .findByUserIdAndDateBetweenOrderByDate(me.getId(), range[0], range[1])
                .stream().map(ScheduleMapper::toAvailabilityResponse).toList();
        return new MyAvailabilityResponse(range[0], range[1], entries, lockedWeeks(range[0], range[1]));
    }

    /** Everyone's availability, for planning. */
    @Transactional(readOnly = true)
    public List<AvailabilityResponse> overview(LocalDate from, LocalDate to) {
        final LocalDate[] range = checkedRange(from, to, 62);
        return availabilityRepository.findForActiveUsersBetween(range[0], range[1])
                .stream().map(ScheduleMapper::toAvailabilityResponse).toList();
    }

    public BulkResult saveMine(List<AvailabilityEntry> entries) {
        final User me = currentUserService.get();
        final LocalDate today = LocalDate.now();
        final Set<LocalDate> locked = new TreeSet<>(lockedWeeksFor(entries.stream().map(AvailabilityEntry::date).toList()));
        final List<LocalDate> skipped = new ArrayList<>();
        int saved = 0;
        int cleared = 0;
        final List<LocalDate> changedDates = new ArrayList<>();

        for (AvailabilityEntry entry : entries) {
            final LocalDate date = entry.date();
            if (date.isBefore(today)) {
                throw new IllegalArgumentException("You cannot change availability for days that have passed.");
            }
            if (date.isAfter(today.plusDays(MAX_DAYS_AHEAD))) {
                throw new IllegalArgumentException("Availability can be entered up to six months ahead.");
            }
            final LocalDate week = ScheduleMapper.weekStart(date);
            if (locked.contains(week)) {
                if (!skipped.contains(week)) {
                    skipped.add(week);
                }
                continue;
            }
            if (apply(me, date, entry.status(), entry.startTime(), entry.endTime(), entry.note())) {
                changedDates.add(date);
                if (entry.status() == null) {
                    cleared++;
                } else {
                    saved++;
                }
            }
        }
        if (!skipped.isEmpty() && changedDates.isEmpty()) {
            throw new IllegalStateException("Those weeks are locked for planning. Ask your manager if something changed.");
        }
        announce(me, changedDates);
        return new BulkResult(saved, cleared, skipped);
    }

    /** Makes each target week a copy of the source week, day by day. Locked weeks are skipped. */
    public BulkResult copyWeek(CopyWeekRequest request) {
        final User me = currentUserService.get();
        final LocalDate source = ScheduleMapper.weekStart(request.sourceWeekStart());
        final Map<DayOfWeek, Availability> template = availabilityRepository
                .findByUserIdAndDateBetweenOrderByDate(me.getId(), source, source.plusDays(6))
                .stream().collect(Collectors.toMap(a -> a.getDate().getDayOfWeek(), Function.identity()));
        if (template.isEmpty()) {
            throw new IllegalArgumentException("The week you picked has no availability to copy.");
        }

        final LocalDate today = LocalDate.now();
        final List<LocalDate> targets = request.targetWeekStarts().stream().map(ScheduleMapper::weekStart)
                .filter(week -> !week.equals(source)).distinct().sorted().toList();
        final Set<LocalDate> locked = new TreeSet<>(lockedWeeksFor(targets));
        final List<LocalDate> skipped = new ArrayList<>();
        final List<LocalDate> changedDates = new ArrayList<>();
        int saved = 0;
        int cleared = 0;

        for (LocalDate week : targets) {
            if (locked.contains(week)) {
                skipped.add(week);
                continue;
            }
            for (int offset = 0; offset < 7; offset++) {
                final LocalDate date = week.plusDays(offset);
                if (date.isBefore(today) || date.isAfter(today.plusDays(MAX_DAYS_AHEAD))) {
                    continue;
                }
                final Availability day = template.get(date.getDayOfWeek());
                final boolean changed = day == null
                        ? apply(me, date, null, null, null, null)
                        : apply(me, date, day.getStatus(), day.getStartTime(), day.getEndTime(), day.getNote());
                if (changed) {
                    changedDates.add(date);
                    if (day == null) {
                        cleared++;
                    } else {
                        saved++;
                    }
                }
            }
        }
        announce(me, changedDates);
        return new BulkResult(saved, cleared, skipped);
    }

    /** Applies a weekly pattern to every matching day in the range. Days of the week not in the pattern stay as they are. */
    public BulkResult recurring(RecurringAvailabilityRequest request) {
        final User me = currentUserService.get();
        final LocalDate today = LocalDate.now();
        final LocalDate from = request.from().isBefore(today) ? today : request.from();
        final LocalDate to = request.to();
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("The end date has to be after the start date.");
        }
        if (to.isAfter(today.plusDays(MAX_DAYS_AHEAD))) {
            throw new IllegalArgumentException("A recurring pattern can run at most six months ahead.");
        }
        final Map<DayOfWeek, RecurringDay> pattern = request.pattern().stream()
                .collect(Collectors.toMap(RecurringDay::dayOfWeek, Function.identity(), (first, second) -> second));

        final List<LocalDate> dates = from.datesUntil(to.plusDays(1)).filter(d -> pattern.containsKey(d.getDayOfWeek())).toList();
        final Set<LocalDate> locked = new TreeSet<>(lockedWeeksFor(dates));
        final List<LocalDate> skipped = new ArrayList<>();
        final List<LocalDate> changedDates = new ArrayList<>();
        int saved = 0;
        for (LocalDate date : dates) {
            final LocalDate week = ScheduleMapper.weekStart(date);
            if (locked.contains(week)) {
                if (!skipped.contains(week)) {
                    skipped.add(week);
                }
                continue;
            }
            final RecurringDay day = pattern.get(date.getDayOfWeek());
            if (apply(me, date, day.status(), day.startTime(), day.endTime(), day.note())) {
                changedDates.add(date);
                saved++;
            }
        }
        announce(me, changedDates);
        return new BulkResult(saved, 0, skipped);
    }

    // ------------------------------------------------------------------ helpers

    /** Writes one day. Returns whether anything changed. */
    private boolean apply(User user, LocalDate date, AvailabilityStatus status, LocalTime start, LocalTime end, String note) {
        final Optional<Availability> existing = availabilityRepository.findByUserIdAndDate(user.getId(), date);
        if (status == null) {
            existing.ifPresent(availabilityRepository::delete);
            return existing.isPresent();
        }
        validateWindow(status, start, end);
        final String cleanNote = note == null || note.isBlank() ? null : note.trim();
        final LocalTime cleanStart = status == AvailabilityStatus.UNAVAILABLE ? null : start;
        final LocalTime cleanEnd = status == AvailabilityStatus.UNAVAILABLE ? null : end;
        final Availability availability = existing.orElseGet(() -> new Availability(user, date));
        if (existing.isPresent()
                && availability.getStatus() == status
                && java.util.Objects.equals(availability.getStartTime(), cleanStart)
                && java.util.Objects.equals(availability.getEndTime(), cleanEnd)
                && java.util.Objects.equals(availability.getNote(), cleanNote)) {
            return false;
        }
        availability.update(status, cleanStart, cleanEnd, cleanNote);
        availabilityRepository.save(availability);
        return true;
    }

    private static void validateWindow(AvailabilityStatus status, LocalTime start, LocalTime end) {
        if (status == AvailabilityStatus.UNAVAILABLE) {
            return;
        }
        if ((start == null) != (end == null)) {
            throw new IllegalArgumentException("Give both a start and an end time, or leave both empty for the whole day.");
        }
        if (start != null && !start.isBefore(end)) {
            throw new IllegalArgumentException("The start time has to be before the end time.");
        }
    }

    private void announce(User user, List<LocalDate> changedDates) {
        if (changedDates.isEmpty()) {
            return;
        }
        final LocalDate first = changedDates.stream().min(LocalDate::compareTo).orElseThrow();
        final LocalDate last = changedDates.stream().max(LocalDate::compareTo).orElseThrow();
        events.publishEvent(new DomainEvents.AvailabilitySubmitted(user, first, last, changedDates.size()));
    }

    private List<LocalDate> lockedWeeks(LocalDate from, LocalDate to) {
        return periodRepository.findByWeekStartBetweenOrderByWeekStart(ScheduleMapper.weekStart(from), to).stream()
                .filter(SchedulePeriod::isAvailabilityLocked).map(SchedulePeriod::getWeekStart).toList();
    }

    private List<LocalDate> lockedWeeksFor(List<LocalDate> dates) {
        if (dates.isEmpty()) {
            return List.of();
        }
        final LocalDate min = dates.stream().min(LocalDate::compareTo).orElseThrow();
        final LocalDate max = dates.stream().max(LocalDate::compareTo).orElseThrow();
        return lockedWeeks(min, max);
    }

    static LocalDate[] checkedRange(LocalDate from, LocalDate to, int maxDays) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("Pick a start and an end date.");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("The end date has to be after the start date.");
        }
        if (from.plusDays(maxDays).isBefore(to)) {
            throw new IllegalArgumentException("Pick a range of at most " + maxDays + " days.");
        }
        return new LocalDate[]{from, to};
    }
}
