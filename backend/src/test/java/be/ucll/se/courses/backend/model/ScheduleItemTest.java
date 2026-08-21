package be.ucll.se.courses.backend.model;

import be.ucll.se.courses.backend.enums.Day;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.enums.Shift;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ScheduleItemTest {

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void initValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    @Test
    void constructor_setsDayShiftAndUser() {
        User user = new User("Jane", "jane", "pw", Role.EMPLOYEE);
        ScheduleItem scheduleItem = new ScheduleItem(Day.MONDAY, Shift.MORNING, user);

        assertThat(scheduleItem.getDay()).isEqualTo(Day.MONDAY);
        assertThat(scheduleItem.getShift()).isEqualTo(Shift.MORNING);
        assertThat(scheduleItem.getUser()).isEqualTo(user);
    }

    @Test
    void nullDay_violatesValidationConstraints() {
        User user = new User("Jane", "jane", "pw", Role.EMPLOYEE);
        ScheduleItem scheduleItem = new ScheduleItem(null, Shift.MORNING, user);

        assertThat(validator.validate(scheduleItem)).isNotEmpty();
    }
}
