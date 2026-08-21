package be.ucll.se.courses.backend.exception;

import be.ucll.se.courses.backend.dtos.ApiError;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiError> handleEntityNotFound(EntityNotFoundException exception) {
        return build(HttpStatus.NOT_FOUND, exception.getMessage(), "The requested resource does not exist.");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResourceFound(NoResourceFoundException exception) {
        return build(HttpStatus.NOT_FOUND, "This endpoint does not exist.", "This endpoint does not exist.");
    }

    @ExceptionHandler(EmptyResultDataAccessException.class)
    public ResponseEntity<ApiError> handleEmptyResult(EmptyResultDataAccessException exception) {
        return build(HttpStatus.NOT_FOUND, "The requested resource does not exist.", "The requested resource does not exist.");
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<ApiError> handleUserAlreadyExists(UserAlreadyExistsException exception) {
        return build(HttpStatus.CONFLICT, exception.getMessage(), "That username is already taken.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException exception) {
        log.warn("Data integrity violation: {}", exception.getMostSpecificCause().getMessage());
        return build(HttpStatus.CONFLICT, "That change conflicts with existing data.", "That change conflicts with existing data.");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException exception) {
        return build(HttpStatus.BAD_REQUEST, exception.getMessage(), "The request could not be processed.");
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiError> handleIllegalState(IllegalStateException exception) {
        return build(HttpStatus.CONFLICT, exception.getMessage(), "The request could not be processed in the current state.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        final List<String> details = exception.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
                .toList();
        final String message = details.isEmpty() ? "The submitted values are not valid." : String.join(", ", details);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.of(HttpStatus.BAD_REQUEST.value(), HttpStatus.BAD_REQUEST.getReasonPhrase(), message, details));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException exception) {
        final List<String> details = exception.getConstraintViolations().stream()
                .map(ConstraintViolation::getMessage)
                .toList();
        final String message = details.isEmpty() ? "The submitted values are not valid." : String.join(", ", details);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.of(HttpStatus.BAD_REQUEST.value(), HttpStatus.BAD_REQUEST.getReasonPhrase(), message, details));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException exception) {
        return build(HttpStatus.BAD_REQUEST, "The request body is missing or malformed.", "The request body is missing or malformed.");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return build(HttpStatus.BAD_REQUEST, "The value for '" + exception.getName() + "' is not valid.", "One of the request values is not valid.");
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> handleMissingParameter(MissingServletRequestParameterException exception) {
        return build(HttpStatus.BAD_REQUEST, "Missing required parameter '" + exception.getParameterName() + "'.", "A required parameter is missing.");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotSupported(HttpRequestMethodNotSupportedException exception) {
        return build(HttpStatus.METHOD_NOT_ALLOWED, "That HTTP method is not supported for this endpoint.", "That HTTP method is not supported for this endpoint.");
    }

    @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
    public ResponseEntity<ApiError> handleBadCredentials(Exception exception) {
        return build(HttpStatus.UNAUTHORIZED, "Invalid username or password.", "Invalid username or password.");
    }

    @ExceptionHandler({DisabledException.class, LockedException.class})
    public ResponseEntity<ApiError> handleAccountUnavailable(Exception exception) {
        return build(HttpStatus.FORBIDDEN, "This account is not available.", "This account is not available.");
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthentication(AuthenticationException exception) {
        return build(HttpStatus.UNAUTHORIZED, "Authentication is required.", "Authentication is required.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException exception) {
        return build(HttpStatus.FORBIDDEN, "You are not allowed to perform this action.", "You are not allowed to perform this action.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception exception) {
        log.error("Unhandled exception", exception);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong. Please try again.", "Something went wrong. Please try again.");
    }

    private ResponseEntity<ApiError> build(HttpStatus status, String message, String fallback) {
        final String safeMessage = message == null || message.isBlank() ? fallback : message;
        return ResponseEntity.status(status)
                .body(ApiError.of(status.value(), status.getReasonPhrase(), safeMessage));
    }
}
