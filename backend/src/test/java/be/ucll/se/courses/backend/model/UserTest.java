package be.ucll.se.courses.backend.model;

import be.ucll.se.courses.backend.enums.Role;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserTest {

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
    void constructor_setsAllFields() {
        User user = new User("Jane", "jane", "pw", Role.ADMIN);

        assertThat(user.getName()).isEqualTo("Jane");
        assertThat(user.getUsername()).isEqualTo("jane");
        assertThat(user.getPassword()).isEqualTo("pw");
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    void nullUsername_violatesValidationConstraints() {
        User user = new User("Jane", null, "pw", Role.ADMIN);

        assertThat(validator.validate(user)).isNotEmpty();
    }
}
