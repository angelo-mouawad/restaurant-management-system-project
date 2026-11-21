package be.ucll.se.courses.backend.controller;

import be.ucll.se.courses.backend.dtos.ScheduleDtos.AvailabilityBulkRequest;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.AvailabilityResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.BulkResult;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.CopyWeekRequest;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.MyAvailabilityResponse;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.RecurringAvailabilityRequest;
import be.ucll.se.courses.backend.service.AvailabilityService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/availability")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public MyAvailabilityResponse mine(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                       @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return availabilityService.mine(from, to);
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public BulkResult saveMine(@Valid @RequestBody AvailabilityBulkRequest request) {
        return availabilityService.saveMine(request.entries());
    }

    @PostMapping("/me/copy-week")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public BulkResult copyWeek(@Valid @RequestBody CopyWeekRequest request) {
        return availabilityService.copyWeek(request);
    }

    @PostMapping("/me/recurring")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public BulkResult recurring(@Valid @RequestBody RecurringAvailabilityRequest request) {
        return availabilityService.recurring(request);
    }

    /** Everyone's availability for a range, for planning. */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public List<AvailabilityResponse> overview(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return availabilityService.overview(from, to);
    }
}
