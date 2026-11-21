package be.ucll.se.courses.backend.controller;

import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftTypeRequest;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftTypeResponse;
import be.ucll.se.courses.backend.service.ShiftTypeService;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/shift-types")
public class ShiftTypeController {

    private final ShiftTypeService shiftTypeService;

    public ShiftTypeController(ShiftTypeService shiftTypeService) {
        this.shiftTypeService = shiftTypeService;
    }

    /** Employees read these too, to show shift names and times in their schedule. */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<ShiftTypeResponse> list() {
        return shiftTypeService.list();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ShiftTypeResponse> create(@Valid @RequestBody ShiftTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shiftTypeService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ShiftTypeResponse update(@PathVariable Long id, @Valid @RequestBody ShiftTypeRequest request) {
        return shiftTypeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        shiftTypeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
