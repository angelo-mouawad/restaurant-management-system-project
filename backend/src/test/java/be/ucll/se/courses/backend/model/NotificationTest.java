package be.ucll.se.courses.backend.model;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationTest {

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
    void onCreate_setsCreatedAtWhenMissing() {
        Notification notification = new Notification();
        notification.setMessage("Low stock warning");

        notification.onCreate();

        assertThat(notification.getCreatedAt()).isNotNull();
        assertThat(notification.getMessage()).isEqualTo("Low stock warning");
    }

    @Test
    void missingMessage_violatesValidationConstraints() {
        Notification notification = new Notification(null, LocalDateTime.now(), null, null);

        assertThat(validator.validate(notification)).isNotEmpty();
    }
}
