package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.model.ScheduleItem;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.ScheduleItemRepository;
import be.ucll.se.courses.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ScheduleItemService {

    private final ScheduleItemRepository scheduleItemRepository;
    private final UserRepository userRepository;

    @Autowired
    public ScheduleItemService(ScheduleItemRepository scheduleItemRepository, UserRepository userRepository) {
        this.scheduleItemRepository = scheduleItemRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ScheduleItem> getScheduleItems() {
        return scheduleItemRepository.findAll();
    }

    public ScheduleItem assignUserToScheduleItem(Long scheduleItemId, Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User id is required");
        }
        final ScheduleItem scheduleItem = findScheduleItem(scheduleItemId);
        final User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User with id " + userId + " not found"));

        scheduleItem.setUser(user);
        return scheduleItemRepository.save(scheduleItem);
    }

    public ScheduleItem removeUserFromScheduleItem(Long scheduleItemId) {
        final ScheduleItem scheduleItem = findScheduleItem(scheduleItemId);
        scheduleItem.setUser(null);
        return scheduleItemRepository.save(scheduleItem);
    }

    private ScheduleItem findScheduleItem(Long scheduleItemId) {
        if (scheduleItemId == null) {
            throw new IllegalArgumentException("Schedule item id is required");
        }
        return scheduleItemRepository.findById(scheduleItemId)
                .orElseThrow(() -> new EntityNotFoundException("Schedule item with id " + scheduleItemId + " not found"));
    }
}
