package be.ucll.se.courses.backend.integration;

import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.UserRepository;
import be.ucll.se.courses.backend.service.JwtService;
import be.ucll.se.courses.backend.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NotificationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Test
    void getNotifications_withValidToken_returnsNotifications() throws Exception {
        User user = seedUser("angelo");
        notificationService.addNotification(user.getUsername(), "Integration ping", null);

        mockMvc.perform(get("/notifications/{username}", user.getUsername())
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].message").value("Integration ping"));
    }

    @Test
    void getNotifications_withoutToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/notifications/{username}", "angelo"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void getNotifications_forAnotherUserAsEmployee_returnsForbidden() throws Exception {
        User employee = seedUser("hunein");

        mockMvc.perform(get("/notifications/{username}", "angelo")
                        .header(HttpHeaders.AUTHORIZATION, bearer(employee)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void addNotification_forUnknownUser_returnsNotFound() throws Exception {
        User user = seedUser("angelo");

        mockMvc.perform(post("/notifications")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"ghost\",\"message\":\"hello\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void addNotification_withBlankMessage_returnsBadRequest() throws Exception {
        User user = seedUser("angelo");

        mockMvc.perform(post("/notifications")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"angelo\",\"message\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    private User seedUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Seed user '" + username + "' not found"));
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }
}
