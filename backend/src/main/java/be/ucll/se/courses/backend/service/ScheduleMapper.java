package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.ScheduleDtos.AvailabilityResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.PeriodResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftTypeResponse;
import be.ucll.se.courses.backend.model.Availability;
import be.ucll.se.courses.backend.model.SchedulePeriod;
import be.ucll.se.courses.backend.model.Shift;
import be.ucll.se.courses.backend.model.ShiftType;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Entity to DTO mapping and small date helpers shared by the scheduling services. */
final class ScheduleMapper {

    static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM", Locale.ENGLISH);
    static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH);

    private ScheduleMapper() {}

    static LocalDate weekStart(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    static double hoursBetween(LocalTime start, LocalTime end) {
        int minutes = (end.getHour() * 60 + end.getMinute()) - (start.getHour() * 60 + start.getMinute());
        if (minutes <= 0) {
            minutes += 24 * 60;
        }
        return minutes / 60.0;
    }

    static String describe(Shift shift) {
        return DAY.format(shift.getDate()) + ", " + TIME.format(shift.getStartTime()) + " to " + TIME.format(shift.getEndTime());
    }

    static ShiftTypeResponse toTypeResponse(ShiftType type) {
        return new ShiftTypeResponse(type.getId(), type.getName(), type.getStartTime(), type.getEndTime(),
                type.getMinStaff(), type.getColor(), type.isActive(), hoursBetween(type.getStartTime(), type.getEndTime()),
                type.getDays());
    }

    static ShiftResponse toShiftResponse(Shift shift) {
        final ShiftType type = shift.getShiftType();
        return new ShiftResponse(shift.getId(), shift.getDate(), shift.getStartTime(), shift.getEndTime(), shift.getHours(),
                shift.getUser().getId(), shift.getUser().getName(),
                type == null ? null : type.getId(),
                type == null ? "Custom" : type.getName(),
                type == null ? "slate" : type.getColor(),
                shift.getNote(), shift.getPeriod().getStatus());
    }

    static AvailabilityResponse toAvailabilityResponse(Availability availability) {
        return new AvailabilityResponse(availability.getUser().getId(), availability.getDate(), availability.getStatus(),
                availability.getStartTime(), availability.getEndTime(), availability.getNote());
    }

    static PeriodResponse toPeriodResponse(SchedulePeriod period, int shiftCount, int changeCount) {
        return new PeriodResponse(period.getWeekStart(), period.getWeekEnd(), period.getStatus(),
                period.isAvailabilityLocked(), period.getPublishedAt(),
                period.getPublishedBy() == null ? null : period.getPublishedBy().getName(), shiftCount, changeCount);
    }
}
