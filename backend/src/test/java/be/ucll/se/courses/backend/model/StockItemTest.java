package be.ucll.se.courses.backend.model;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StockItemTest {

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
    void constructor_setsNameAndQuantity() {
        StockItem stockItem = new StockItem("Sauce", 15);

        assertThat(stockItem.getName()).isEqualTo("Sauce");
        assertThat(stockItem.getQuantity()).isEqualTo(15);
    }

    @Test
    void nullName_violatesValidationConstraints() {
        StockItem stockItem = new StockItem(null, 10);

        assertThat(validator.validate(stockItem)).isNotEmpty();
    }
}
