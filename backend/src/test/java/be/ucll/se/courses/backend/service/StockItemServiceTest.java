package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.repository.StockItemRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockItemServiceTest {

    @Mock
    private StockItemRepository stockItemRepository;

    @InjectMocks
    private StockItemService stockItemService;

    private StockItem stockItem;

    @BeforeEach
    void setUp() {
        stockItem = new StockItem("Sauce", 10);
        stockItem.setId(1L);
    }

    @Test
    void addStockItem_savesEntityWithProvidedValues() {
        var captor = ArgumentCaptor.forClass(StockItem.class);
        when(stockItemRepository.save(captor.capture()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = stockItemService.addStockItem("Sauce", 10);

        assertThat(result.getName()).isEqualTo("Sauce");
        assertThat(result.getQuantity()).isEqualTo(10);
        verify(stockItemRepository).save(result);
    }

    @Test
    void addStockItem_withBlankName_throwsIllegalArgument() {
        assertThatThrownBy(() -> stockItemService.addStockItem("  ", 10))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void addStockItem_withNegativeQuantity_throwsIllegalArgument() {
        assertThatThrownBy(() -> stockItemService.addStockItem("Sauce", -1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void increaseQuantity_updatesQuantityAndPersists() {
        when(stockItemRepository.findById(1L)).thenReturn(Optional.of(stockItem));
        when(stockItemRepository.save(stockItem)).thenReturn(stockItem);

        var result = stockItemService.increaseQuantity(1L, 5);

        assertThat(result.getQuantity()).isEqualTo(15);
        verify(stockItemRepository).save(stockItem);
    }

    @Test
    void decreaseQuantity_updatesQuantityAndPersists() {
        when(stockItemRepository.findById(1L)).thenReturn(Optional.of(stockItem));
        when(stockItemRepository.save(stockItem)).thenReturn(stockItem);

        var result = stockItemService.decreaseQuantity(1L, 3);

        assertThat(result.getQuantity()).isEqualTo(7);
        verify(stockItemRepository).save(stockItem);
    }

    @Test
    void decreaseQuantity_belowZero_throwsIllegalArgument() {
        when(stockItemRepository.findById(1L)).thenReturn(Optional.of(stockItem));

        assertThatThrownBy(() -> stockItemService.decreaseQuantity(1L, 50))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void increaseQuantity_withNullAmount_throwsIllegalArgument() {
        assertThatThrownBy(() -> stockItemService.increaseQuantity(1L, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void increaseQuantity_forUnknownId_throwsEntityNotFound() {
        when(stockItemRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stockItemService.increaseQuantity(99L, 1))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void removeStockItem_forUnknownId_throwsEntityNotFound() {
        when(stockItemRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> stockItemService.removeStockItem(99L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void removeStockItem_forKnownId_deletes() {
        when(stockItemRepository.existsById(1L)).thenReturn(true);

        stockItemService.removeStockItem(1L);

        verify(stockItemRepository).deleteById(1L);
    }
}
