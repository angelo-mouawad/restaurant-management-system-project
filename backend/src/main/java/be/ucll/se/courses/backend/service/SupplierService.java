package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.StockDtos.SupplierRequest;
import be.ucll.se.courses.backend.dtos.StockDtos.SupplierResponse;
import be.ucll.se.courses.backend.exception.BusinessRuleException;
import be.ucll.se.courses.backend.model.Supplier;
import be.ucll.se.courses.backend.repository.PurchaseOrderRepository;
import be.ucll.se.courses.backend.repository.StockItemRepository;
import be.ucll.se.courses.backend.repository.SupplierRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final StockItemRepository itemRepository;
    private final PurchaseOrderRepository orderRepository;

    public SupplierService(SupplierRepository supplierRepository, StockItemRepository itemRepository,
                           PurchaseOrderRepository orderRepository) {
        this.supplierRepository = supplierRepository;
        this.itemRepository = itemRepository;
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public List<SupplierResponse> list() {
        return supplierRepository.findAllByOrderByName().stream().map(this::toResponse).toList();
    }

    public SupplierResponse create(SupplierRequest request) {
        final String name = request.name().trim();
        if (supplierRepository.existsByNameIgnoreCase(name)) {
            throw new BusinessRuleException("SUPPLIER_EXISTS", "There is already a supplier called " + name + ".");
        }
        return toResponse(supplierRepository.save(new Supplier(name, clean(request.contactName()), clean(request.email()),
                clean(request.phone()), request.leadTimeDays())));
    }

    public SupplierResponse update(Long id, SupplierRequest request) {
        final Supplier supplier = find(id);
        final String name = request.name().trim();
        if (supplierRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new BusinessRuleException("SUPPLIER_EXISTS", "There is already a supplier called " + name + ".");
        }
        supplier.setName(name);
        supplier.setContactName(clean(request.contactName()));
        supplier.setEmail(clean(request.email()));
        supplier.setPhone(clean(request.phone()));
        supplier.setLeadTimeDays(request.leadTimeDays());
        return toResponse(supplier);
    }

    public void delete(Long id) {
        final Supplier supplier = find(id);
        if (orderRepository.countBySupplierId(id) > 0) {
            throw new BusinessRuleException("SUPPLIER_IN_USE",
                    supplier.getName() + " has purchase orders, so it cannot be deleted. Its order history would be lost.");
        }
        // Items keep existing without a supplier (the foreign key sets it to null).
        itemRepository.findAllWithSupplier(true).stream()
                .filter(item -> item.getSupplier() != null && item.getSupplier().getId().equals(id))
                .forEach(item -> item.setSupplier(null));
        supplierRepository.delete(supplier);
    }

    Supplier find(Long id) {
        return supplierRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Supplier not found."));
    }

    private SupplierResponse toResponse(Supplier supplier) {
        return new SupplierResponse(supplier.getId(), supplier.getName(), supplier.getContactName(), supplier.getEmail(),
                supplier.getPhone(), supplier.getLeadTimeDays(), itemRepository.countBySupplierId(supplier.getId()));
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
