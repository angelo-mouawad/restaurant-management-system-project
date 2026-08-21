package be.ucll.se.courses.backend.exception;

public class UserAlreadyExistsException extends RuntimeException {
    public UserAlreadyExistsException(String username) {
        super("Username '" + username + "' is already in use");
    }
}
