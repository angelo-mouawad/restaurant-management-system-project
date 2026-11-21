package be.ucll.se.courses.backend.integration;

import be.ucll.se.courses.backend.enums.AvailabilityStatus;
import be.ucll.se.courses.backend.enums.NotificationType;
import be.ucll.se.courses.backend.enums.Role;
import be.ucll.se.courses.backend.enums.StockCategory;
import be.ucll.se.courses.backend.enums.StockUnit;
import be.ucll.se.courses.backend.model.Availability;
import be.ucll.se.courses.backend.model.ShiftType;
import be.ucll.se.courses.backend.model.StockItem;
import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.AvailabilityRepository;
import be.ucll.se.courses.backend.repository.NotificationRepository;
import be.ucll.se.courses.backend.repository.ShiftTypeRepository;
import be.ucll.se.courses.backend.repository.StockItemRepository;
import be.ucll.se.courses.backend.repository.UserRepository;
import be.ucll.se.courses.backend.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** End to end checks of the rules that matter most: who may do what, scheduling, stock and notifications. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RestaurantFlowsIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository users;
    @Autowired private ShiftTypeRepository shiftTypes;
    @Autowired private AvailabilityRepository availability;
    @Autowired private StockItemRepository items;
    @Autowired private NotificationRepository notifications;
    @Autowired private PasswordEncoder passwordEncoder;

    private User admin;
    private User manager;
    private User employee;
    private ShiftType evening;
    private LocalDate nextMonday;

    @BeforeEach
    void setUp() {
        admin = user("admin", Role.ADMIN, null);
        manager = user("manager", Role.MANAGER, null);
        employee = user("employee", Role.EMPLOYEE, manager);
        evening = shiftTypes.save(new ShiftType("Evening", LocalTime.of(17, 0), LocalTime.of(23, 0), 1, "indigo"));
        nextMonday = LocalDate.now().with(DayOfWeek.MONDAY).plusWeeks(1);
    }

    // ------------------------------------------------------------------ permissions

    @Test
    void anonymousRequestsAreRejected() throws Exception {
        mvc.perform(get("/stock/overview")).andExpect(status().isUnauthorized());
    }

    @Test
    void employeesCannotReachStockOrPlanning() throws Exception {
        mvc.perform(as(employee, get("/stock/items"))).andExpect(status().isForbidden());
        mvc.perform(as(employee, get("/schedule/planning").param("from", nextMonday.toString()).param("to", nextMonday.toString())))
                .andExpect(status().isForbidden());
        mvc.perform(as(employee, post("/users").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"username\":\"xyz\",\"password\":\"password1\",\"role\":\"EMPLOYEE\"}")))
                .andExpect(status().isForbidden());
    }

    @Test
    void managersCanOnlyManageEmployees() throws Exception {
        mvc.perform(as(manager, post("/users").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Boss\",\"username\":\"boss\",\"password\":\"password1\",\"role\":\"MANAGER\"}")))
                .andExpect(status().isForbidden());
        mvc.perform(as(manager, post("/users").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New Cook\",\"username\":\"newcook\",\"password\":\"password1\",\"role\":\"EMPLOYEE\"}")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.managerName").value("manager"));
        mvc.perform(as(manager, patch("/users/" + admin.getId() + "/active").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}")))
                .andExpect(status().isForbidden());
    }

    @Test
    void roleChangesNotifyThePerson() throws Exception {
        mvc.perform(as(admin, put("/users/" + employee.getId()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"employee\",\"role\":\"MANAGER\"}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("MANAGER"));
        assertThat(types(employee)).contains(NotificationType.ROLE_CHANGED);
    }

    @Test
    void contactDetailsAreHiddenFromEmployees() throws Exception {
        mvc.perform(as(employee, get("/users/" + manager.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.contactVisible").value(false));
        mvc.perform(as(manager, get("/users/" + employee.getId())))
                .andExpect(jsonPath("$.email").value("employee@test.be"));
    }

    @Test
    void deactivatedUsersLoseAccessImmediately() throws Exception {
        final String token = jwtService.generateToken(employee);
        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(as(manager, patch("/users/" + employee.getId() + "/active").contentType(MediaType.APPLICATION_JSON)
                .content("{\"active\":false}"))).andExpect(status().isOk());
        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ scheduling

    @Test
    void draftsStayHiddenUntilPublishedAndPublishingNotifies() throws Exception {
        markAvailable(nextMonday);
        assign(nextMonday, false).andExpect(status().isCreated());

        mvc.perform(as(employee, get("/schedule/me").param("from", nextMonday.toString()).param("to", nextMonday.toString())))
                .andExpect(jsonPath("$.shifts.length()").value(0));

        mvc.perform(as(manager, post("/schedule/periods/" + nextMonday + "/publish"))).andExpect(status().isOk());

        mvc.perform(as(employee, get("/schedule/me").param("from", nextMonday.toString()).param("to", nextMonday.toString())))
                .andExpect(jsonPath("$.shifts.length()").value(1))
                .andExpect(jsonPath("$.weeks[0].hours").value(6.0));
        assertThat(types(employee)).contains(NotificationType.SCHEDULE_PUBLISHED);
    }

    @Test
    void unavailableNeedsConfirmationAndDoubleBookingIsRefused() throws Exception {
        final Availability day = new Availability(employee, nextMonday);
        day.update(AvailabilityStatus.UNAVAILABLE, null, null, "Exam");
        availability.save(day);

        assign(nextMonday, false).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SHIFT_WARNINGS"));
        assign(nextMonday, true).andExpect(status().isCreated());
        assign(nextMonday, true).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SHIFT_DOUBLE_BOOKED"));
    }

    @Test
    void changingAPublishedShiftNotifiesTheEmployeeAndIsLogged() throws Exception {
        markAvailable(nextMonday);
        final String body = assign(nextMonday, false).andReturn().getResponse().getContentAsString();
        final String id = body.replaceAll(".*?\"id\":(\\d+).*", "$1");
        mvc.perform(as(manager, post("/schedule/periods/" + nextMonday + "/publish"))).andExpect(status().isOk());

        mvc.perform(as(manager, put("/schedule/shifts/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":" + employee.getId() + ",\"date\":\"" + nextMonday
                                + "\",\"startTime\":\"18:00\",\"endTime\":\"23:00\",\"force\":true}")))
                .andExpect(status().isOk());

        assertThat(types(employee)).contains(NotificationType.SHIFT_CHANGED);
        mvc.perform(as(manager, get("/schedule/periods/" + nextMonday + "/changes")))
                .andExpect(jsonPath("$[0].changeType").value("MODIFIED"));
    }

    @Test
    void lockedWeeksRefuseAvailabilityChanges() throws Exception {
        mvc.perform(as(manager, post("/schedule/periods/" + nextMonday + "/lock"))).andExpect(status().isOk());
        mvc.perform(as(employee, put("/availability/me").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"entries\":[{\"date\":\"" + nextMonday + "\",\"status\":\"AVAILABLE\"}]}")))
                .andExpect(status().isConflict());
    }

    @Test
    void submittingAvailabilityNotifiesTheEmployeesManager() throws Exception {
        mvc.perform(as(employee, put("/availability/me").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"entries\":[{\"date\":\"" + nextMonday + "\",\"status\":\"PREFERRED\",\"startTime\":\"12:00\",\"endTime\":\"20:00\"}]}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saved").value(1));
        assertThat(types(manager)).contains(NotificationType.AVAILABILITY_SUBMITTED);
    }

    // ------------------------------------------------------------------ stock

    @Test
    void movementsChangeQuantityAndCrossingTheThresholdAlertsManagement() throws Exception {
        final StockItem item = items.save(new StockItem("Tomatoes", StockCategory.PRODUCE, StockUnit.KG,
                new BigDecimal("5"), new BigDecimal("2.50"), null));

        mvc.perform(as(manager, post("/stock/items/" + item.getId() + "/movements").contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"DELIVERY\",\"quantity\":10}"))).andExpect(status().isCreated());
        mvc.perform(as(manager, post("/stock/items/" + item.getId() + "/movements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"USAGE\",\"quantity\":20}")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));
        mvc.perform(as(manager, post("/stock/items/" + item.getId() + "/movements").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"USAGE\",\"quantity\":7}")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.quantityAfter").value(3));

        assertThat(types(manager)).contains(NotificationType.LOW_STOCK);
        assertThat(types(admin)).contains(NotificationType.LOW_STOCK);
        assertThat(types(employee)).doesNotContain(NotificationType.LOW_STOCK);
    }

    @Test
    void receivingAnOrderAddsItsLinesToStockOnce() throws Exception {
        final StockItem item = items.save(new StockItem("Rice", StockCategory.DRY_GOODS, StockUnit.KG,
                new BigDecimal("2"), new BigDecimal("1.80"), null));
        final String supplier = mvc.perform(as(manager, post("/stock/suppliers").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Wholesale\",\"leadTimeDays\":2}"))).andReturn().getResponse().getContentAsString();
        final String supplierId = supplier.replaceAll(".*?\"id\":(\\d+).*", "$1");
        final String order = mvc.perform(as(manager, post("/stock/orders").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"supplierId\":" + supplierId + ",\"lines\":[{\"itemId\":" + item.getId() + ",\"quantity\":25}]}")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        final String orderId = order.replaceAll(".*?\"id\":(\\d+).*", "$1");

        mvc.perform(as(manager, post("/stock/orders/" + orderId + "/receive"))).andExpect(status().isConflict());
        mvc.perform(as(manager, post("/stock/orders/" + orderId + "/order"))).andExpect(status().isOk());
        mvc.perform(as(manager, post("/stock/orders/" + orderId + "/receive")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RECEIVED"));
        mvc.perform(as(manager, post("/stock/orders/" + orderId + "/receive"))).andExpect(status().isConflict());

        assertThat(items.findById(item.getId()).orElseThrow().getQuantity()).isEqualByComparingTo("25");
        assertThat(types(manager)).contains(NotificationType.PURCHASE_ORDER_RECEIVED);
    }

    // ------------------------------------------------------------------ helpers

    private User user(String username, Role role, User manager) {
        final User user = new User(username, username, passwordEncoder.encode("password1"), role);
        user.setEmail(username + "@test.be");
        user.setManager(manager);
        return users.save(user);
    }

    private void markAvailable(LocalDate date) {
        final Availability day = new Availability(employee, date);
        day.update(AvailabilityStatus.AVAILABLE, null, null, null);
        availability.save(day);
    }

    private ResultActions assign(LocalDate date, boolean force) throws Exception {
        return mvc.perform(as(manager, post("/schedule/shifts").contentType(MediaType.APPLICATION_JSON)
                .content("{\"userId\":" + employee.getId() + ",\"date\":\"" + date + "\",\"shiftTypeId\":" + evening.getId()
                        + ",\"force\":" + force + "}")));
    }

    private MockHttpServletRequestBuilder as(User user, MockHttpServletRequestBuilder request) {
        return request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(user));
    }

    private List<NotificationType> types(User user) {
        return notifications.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 50))
                .map(n -> n.getType()).getContent();
    }
}
