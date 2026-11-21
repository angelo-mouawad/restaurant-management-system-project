package be.ucll.se.courses.backend.dtos;

import be.ucll.se.courses.backend.enums.AvailabilityStatus;
import be.ucll.se.courses.backend.enums.PeriodStatus;
import be.ucll.se.courses.backend.enums.ShiftChangeType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

/** Requests and responses for shift types, availability and planning. */
public final class ScheduleDtos {

    private ScheduleDtos() {}

    // ------------------------------------------------------------------ shift types

    public record ShiftTypeRequest(
            @NotBlank(message = "Name is required") @Size(max = 100, message = "Name may not exceed 100 characters") String name,
            @NotNull(message = "Start time is required") LocalTime startTime,
            @NotNull(message = "End time is required") LocalTime endTime,
            @Min(value = 0, message = "Minimum staff may not be negative") @Max(value = 50, message = "Minimum staff may not exceed 50") int minStaff,
            @Pattern(regexp = "teal|amber|indigo|rose|sky|slate", message = "Pick one of the listed colours") String color,
            Boolean active,
            /** Weekdays the shift runs on. Empty or missing means every day. */
            List<DayOfWeek> days) {
    }

    public record ShiftTypeResponse(Long id, String name, LocalTime startTime, LocalTime endTime, int minStaff,
                                    String color, boolean active, double hours, List<DayOfWeek> days) {
    }

    // ------------------------------------------------------------------ availability

    /** One day. A null status clears whatever was saved for that day. */
    public record AvailabilityEntry(
            @NotNull(message = "Date is required") LocalDate date,
            AvailabilityStatus status,
            LocalTime startTime,
            LocalTime endTime,
            @Size(max = 500, message = "Notes may not exceed 500 characters") String note) {
    }

    public record AvailabilityBulkRequest(
            @NotEmpty(message = "Add at least one day") @Size(max = 200, message = "Save at most 200 days at once")
            List<@Valid AvailabilityEntry> entries) {
    }

    public record CopyWeekRequest(
            @NotNull(message = "Pick the week to copy") LocalDate sourceWeekStart,
            @NotEmpty(message = "Pick at least one week to copy to") @Size(max = 12, message = "Copy to at most 12 weeks at once")
            List<LocalDate> targetWeekStarts) {
    }

    public record RecurringDay(
            @NotNull(message = "Day of the week is required") DayOfWeek dayOfWeek,
            @NotNull(message = "Status is required") AvailabilityStatus status,
            LocalTime startTime,
            LocalTime endTime,
            @Size(max = 500, message = "Notes may not exceed 500 characters") String note) {
    }

    public record RecurringAvailabilityRequest(
            @NotNull(message = "Start date is required") LocalDate from,
            @NotNull(message = "End date is required") LocalDate to,
            @NotEmpty(message = "Set at least one day of the week") List<@Valid RecurringDay> pattern) {
    }

    public record AvailabilityResponse(Long userId, LocalDate date, AvailabilityStatus status,
                                       LocalTime startTime, LocalTime endTime, String note) {
    }

    /** What the employee needs to edit a range: their entries and which weeks can no longer change. */
    public record MyAvailabilityResponse(LocalDate from, LocalDate to, List<AvailabilityResponse> entries,
                                         List<LocalDate> lockedWeeks) {
    }

    public record BulkResult(int saved, int cleared, List<LocalDate> skippedLockedWeeks) {
    }

    // ------------------------------------------------------------------ shifts and planning

    public record ShiftRequest(
            @NotNull(message = "Pick an employee") Long userId,
            @NotNull(message = "Pick a date") LocalDate date,
            Long shiftTypeId,
            LocalTime startTime,
            LocalTime endTime,
            @Size(max = 500, message = "Notes may not exceed 500 characters") String note,
            /** Save even though it raises warnings (unavailable, over hours). Double booking is never allowed. */
            boolean force) {
    }

    public record ShiftResponse(Long id, LocalDate date, LocalTime startTime, LocalTime endTime, double hours,
                                Long userId, String userName, Long shiftTypeId, String shiftTypeName, String color,
                                String note, PeriodStatus periodStatus) {
    }

    public record PeriodResponse(LocalDate weekStart, LocalDate weekEnd, PeriodStatus status, boolean availabilityLocked,
                                 LocalDateTime publishedAt, String publishedByName, int shiftCount, int changeCount) {
    }

    /** ERROR: should be fixed. WARNING: worth a look. */
    public record PlanningWarning(String type, String severity, LocalDate date, Long userId, Long shiftId,
                                  Long shiftTypeId, String message) {
    }

    public record PlanningEmployee(Long id, String name, String position, int maxWeeklyHours,
                                   Map<LocalDate, Double> hoursByWeek) {
    }

    public record PlanningResponse(LocalDate from, LocalDate to, List<PlanningEmployee> employees,
                                   List<ShiftTypeResponse> shiftTypes, List<ShiftResponse> shifts,
                                   List<AvailabilityResponse> availability, List<PeriodResponse> periods,
                                   List<PlanningWarning> warnings) {
    }

    public record WeekSummary(LocalDate weekStart, double hours, int shiftCount, boolean published) {
    }

    public record MyScheduleResponse(LocalDate from, LocalDate to, List<ShiftResponse> shifts, List<WeekSummary> weeks) {
    }

    public record ShiftChangeResponse(Long id, ShiftChangeType changeType, String description, String affectedUserName,
                                      String changedByName, LocalDateTime changedAt) {
    }
}
