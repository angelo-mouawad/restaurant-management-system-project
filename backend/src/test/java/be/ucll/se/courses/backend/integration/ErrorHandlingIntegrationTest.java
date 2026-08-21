package be.ucll.se.courses.backend.integration;

import be.ucll.se.courses.backend.model.User;
import be.ucll.se.courses.backend.repository.UserRepository;
import be.ucll.se.courses.backend.service.JwtService;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ErrorHandlingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void status_isPubliclyAvailable() throws Exception {
        mockMvc.perform(get("/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void login_withValidCredentials_setsHttpOnlyCookieAndHidesToken() throws Exception {
        mockMvc.perform(post("/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"angelo\",\"password\":\"angelo123\"}"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("authToken"))
                .andExpect(cookie().httpOnly("authToken", true))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.role").value("admin"));
    }

    @Test
    void login_withWrongPassword_returnsUnauthorizedJson() throws Exception {
        mockMvc.perform(post("/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"angelo\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void login_withMissingFields_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void login_withMalformedBody_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void createStockItem_asEmployee_returnsForbidden() throws Exception {
        mockMvc.perform(post("/stockItem")
                        .header(HttpHeaders.AUTHORIZATION, bearer("hunein"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Pickles\",\"quantity\":5}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void createStockItem_withBlankName_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/stockItem")
                        .header(HttpHeaders.AUTHORIZATION, bearer("angelo"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  \",\"quantity\":5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void increaseStockItem_forUnknownId_returnsNotFound() throws Exception {
        mockMvc.perform(post("/stockItem/{id}/increase", 999999)
                        .header(HttpHeaders.AUTHORIZATION, bearer("angelo"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void decreaseStockItem_withZeroAmount_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/stockItem/{id}/decrease", 1)
                        .header(HttpHeaders.AUTHORIZATION, bearer("angelo"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void protectedEndpoint_withGarbageToken_returnsUnauthorizedJson() throws Exception {
        mockMvc.perform(get("/stockItem")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void userById_forUnknownId_returnsNotFound() throws Exception {
        mockMvc.perform(get("/users/{id}", 999999)
                        .header(HttpHeaders.AUTHORIZATION, bearer("angelo")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void userById_withNonNumericId_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/users/{id}", "abc")
                        .header(HttpHeaders.AUTHORIZATION, bearer("angelo")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    private String bearer(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Seed user '" + username + "' not found"));
        return "Bearer " + jwtService.generateToken(user);
    }
}
