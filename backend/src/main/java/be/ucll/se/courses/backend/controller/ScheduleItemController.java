package be.ucll.se.courses.backend.controller;

import be.ucll.se.courses.backend.model.ScheduleItem;
import be.ucll.se.courses.backend.service.ScheduleItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/scheduleItem")
public class ScheduleItemController {

    private final ScheduleItemService scheduleItemService;

    @Autowired
    public ScheduleItemController(ScheduleItemService scheduleItemService) {
        this.scheduleItemService = scheduleItemService;
    }

    @GetMapping
    public List<ScheduleItem> getScheduleItems() {
        return scheduleItemService.getScheduleItems();
    }

    @PostMapping("/{scheduleItemId}/assign/{userId}")
    public ScheduleItem assignUserToScheduleItem(@PathVariable Long scheduleItemId, @PathVariable Long userId) {
        return scheduleItemService.assignUserToScheduleItem(scheduleItemId, userId);
    }

    @PostMapping("/{scheduleItemId}/unassign")
    @PreAuthorize("hasRole('ADMIN')")
    public ScheduleItem removeUserFromScheduleItem(@PathVariable Long scheduleItemId) {
        return scheduleItemService.removeUserFromScheduleItem(scheduleItemId);
    }
}
