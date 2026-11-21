package be.ucll.se.courses.backend.service;

import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftTypeRequest;
import be.ucll.se.courses.backend.dtos.ScheduleDtos.ShiftTypeResponse;
import be.ucll.se.courses.backend.exception.BusinessRuleException;
import be.ucll.se.courses.backend.model.ShiftType;
import be.ucll.se.courses.backend.repository.ShiftRepository;
import be.ucll.se.courses.backend.repository.ShiftTypeRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ShiftTypeService {

    private final ShiftTypeRepository shiftTypeRepository;
    private final ShiftRepository shiftRepository;

    public ShiftTypeService(ShiftTypeRepository shiftTypeRepository, ShiftRepository shiftRepository) {
        this.shiftTypeRepository = shiftTypeRepository;
        this.shiftRepository = shiftRepository;
    }

    @Transactional(readOnly = true)
    public List<ShiftTypeResponse> list() {
        return shiftTypeRepository.findAllByOrderByStartTime().stream().map(ScheduleMapper::toTypeResponse).toList();
    }

    public ShiftTypeResponse create(ShiftTypeRequest request) {
        final String name = request.name().trim();
        if (shiftTypeRepository.existsByNameIgnoreCase(name)) {
            throw new BusinessRuleException("SHIFT_TYPE_EXISTS", "A shift type called " + name + " already exists.");
        }
        validateTimes(request);
        final ShiftType type = new ShiftType(name, request.startTime(), request.endTime(), request.minStaff(),
                request.color() == null ? "teal" : request.color());
        if (request.active() != null) {
            type.setActive(request.active());
        }
        type.setDays(request.days());
        return ScheduleMapper.toTypeResponse(shiftTypeRepository.save(type));
    }

    public ShiftTypeResponse update(Long id, ShiftTypeRequest request) {
        final ShiftType type = find(id);
        final String name = request.name().trim();
        if (shiftTypeRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new BusinessRuleException("SHIFT_TYPE_EXISTS", "A shift type called " + name + " already exists.");
        }
        validateTimes(request);
        type.setName(name);
        type.setStartTime(request.startTime());
        type.setEndTime(request.endTime());
        type.setMinStaff(request.minStaff());
        if (request.color() != null) {
            type.setColor(request.color());
        }
        if (request.active() != null) {
            type.setActive(request.active());
        }
        type.setDays(request.days());
        return ScheduleMapper.toTypeResponse(type);
    }

    /** Types that were already used are deactivated instead, so existing shifts keep their label. */
    public void delete(Long id) {
        final ShiftType type = find(id);
        if (shiftRepository.countByShiftTypeId(id) > 0) {
            type.setActive(false);
            return;
        }
        shiftTypeRepository.delete(type);
    }

    ShiftType find(Long id) {
        return shiftTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Shift type not found."));
    }

    private static void validateTimes(ShiftTypeRequest request) {
        if (request.startTime().equals(request.endTime())) {
            throw new IllegalArgumentException("A shift has to start and end at different times.");
        }
    }
}
