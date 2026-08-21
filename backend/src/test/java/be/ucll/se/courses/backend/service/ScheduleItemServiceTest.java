package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.enums.Day;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.enums.Shift;
import be.ucll.se.courses.backend.model.ScheduleItem;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.ScheduleItemRepository;
import be.ucll.se.courses.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduleItemServiceTest {

    @Mock
    private ScheduleItemRepository scheduleItemRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ScheduleItemService scheduleItemService;

    @Test
    void getScheduleItems_returnsAllRecords() {
        var scheduleItems = List.of(new ScheduleItem(Day.MONDAY, Shift.MORNING, null));
        when(scheduleItemRepository.findAll()).thenReturn(scheduleItems);

        var result = scheduleItemService.getScheduleItems();

        assertThat(result).containsExactlyElementsOf(scheduleItems);
    }

    @Test
    void assignUserToScheduleItem_linksUserAndPersists() {
        var scheduleItem = new ScheduleItem(Day.MONDAY, Shift.MORNING, null);
        scheduleItem.setId(5L);
        var user = new User("Jane", "jane", "pw", Role.EMPLOYEE);
        user.setId(9L);

        when(scheduleItemRepository.findById(5L)).thenReturn(Optional.of(scheduleItem));
        when(userRepository.findById(9L)).thenReturn(Optional.of(user));
        when(scheduleItemRepository.save(scheduleItem)).thenReturn(scheduleItem);

        var result = scheduleItemService.assignUserToScheduleItem(5L, 9L);

        assertThat(result.getUser()).isEqualTo(user);
        verify(scheduleItemRepository).save(scheduleItem);
    }

    @Test
    void assignUserToScheduleItem_withUnknownScheduleItem_throwsEntityNotFound() {
        when(scheduleItemRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> scheduleItemService.assignUserToScheduleItem(404L, 9L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void assignUserToScheduleItem_withUnknownUser_throwsEntityNotFound() {
        var scheduleItem = new ScheduleItem(Day.MONDAY, Shift.MORNING, null);
        scheduleItem.setId(5L);
        when(scheduleItemRepository.findById(5L)).thenReturn(Optional.of(scheduleItem));
        when(userRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> scheduleItemService.assignUserToScheduleItem(5L, 404L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void removeUserFromScheduleItem_unassignsAndPersists() {
        var user = new User("Jane", "jane", "pw", Role.EMPLOYEE);
        var scheduleItem = new ScheduleItem(Day.MONDAY, Shift.MORNING, user);
        scheduleItem.setId(4L);

        when(scheduleItemRepository.findById(4L)).thenReturn(Optional.of(scheduleItem));
        when(scheduleItemRepository.save(scheduleItem)).thenReturn(scheduleItem);

        var result = scheduleItemService.removeUserFromScheduleItem(4L);

        assertThat(result.getUser()).isNull();
        verify(scheduleItemRepository).save(scheduleItem);
    }
}
