package be.ucll.se.courses.backend.controller;

import be.ucll.se.courses.backend.dtos.ScheduleDtos.MyScheduleResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.PeriodResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.PlanningResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftChangeResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftRequest;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftResponse;
import be.ucll.se.courses.backend.service.ScheduleService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    // ------------------------------------------------------------------ employees

    /** The signed-in employee's published shifts. */
    @GetMapping("/me")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public MyScheduleResponse mine(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                   @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return scheduleService.mine(from, to);
    }

    // ------------------------------------------------------------------ planning (management)

    @GetMapping("/planning")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public PlanningResponse planning(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return scheduleService.planning(from, to);
    }

    @GetMapping("/users/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public MyScheduleResponse forUser(@PathVariable Long userId,
                                      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return scheduleService.forUser(userId, from, to);
    }

    @GetMapping("/periods")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public List<PeriodResponse> periods(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return scheduleService.periods(from, to);
    }

    @PostMapping("/shifts")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ShiftResponse> assign(@Valid @RequestBody ShiftRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleService.assign(request));
    }

    @PutMapping("/shifts/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ShiftResponse update(@PathVariable Long id, @Valid @RequestBody ShiftRequest request) {
        return scheduleService.update(id, request);
    }

    @DeleteMapping("/shifts/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        scheduleService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/periods/{weekStart}/publish")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public PeriodResponse publish(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return scheduleService.publish(weekStart);
    }

    @PostMapping("/periods/{weekStart}/lock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public PeriodResponse lock(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return scheduleService.setAvailabilityLock(weekStart, true);
    }

    @PostMapping("/periods/{weekStart}/unlock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public PeriodResponse unlock(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return scheduleService.setAvailabilityLock(weekStart, false);
    }

    @GetMapping("/periods/{weekStart}/changes")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public List<ShiftChangeResponse> changes(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return scheduleService.changes(weekStart);
    }
}
