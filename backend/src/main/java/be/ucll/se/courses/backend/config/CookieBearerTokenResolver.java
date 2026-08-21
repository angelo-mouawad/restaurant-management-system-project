package be.ucll.se.courses.backend.config;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;

import java.util.Arrays;
import java.util.Set;

public class CookieBearerTokenResolver implements BearerTokenResolver {

    private static final String AUTH_COOKIE = "authToken";

    private static final Set<String> UNPROTECTED_PATHS = Set.of(
            "/users/login",
            "/users/signup",
            "/users/logout",
            "/status",
            "/error");

    private final BearerTokenResolver defaultResolver = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        final String path = request.getRequestURI();
        if (path != null && UNPROTECTED_PATHS.stream().anyMatch(path::startsWith)) {
            return null;
        }

        final String tokenFromHeader = defaultResolver.resolve(request);
        if (tokenFromHeader != null && !tokenFromHeader.isBlank()) {
            return tokenFromHeader;
        }

        final Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        return Arrays.stream(cookies)
                .filter(cookie -> AUTH_COOKIE.equals(cookie.getName()))
                .map(Cookie::getValue)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
    }
}
