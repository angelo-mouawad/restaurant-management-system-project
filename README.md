# Restaurant Management System

A full stack web app for running the day to day side of a restaurant: tracking stock levels, assigning staff to shifts, and pushing notifications to the people affected.

Built as a university **scrum team project at UCLL following an agile aproach**. Spring Boot REST API on one side, Next.js App Router on the other, JWT auth in an httpOnly cookie between them.

## What it does

**Stock management.** Admins can add items, increase or decrease quantities, and remove items that hit zero. Anything that drops below 10 units automatically fires a low stock notification.

**Shift scheduling.** A fixed grid of 14 shifts (morning and evening, seven days). Employees can claim open shifts, admins can assign or unassign anyone. Both actions notify the affected user.

**Notifications.** Every user has their own feed, sorted newest first. Users can only read their own; admins can read anyone's.

**Roles.** Admin, employee, and guest. Role checks run on the server, not just in the UI, so hiding a button is not the only thing standing between an employee and the stock endpoints.

**Theme and language.** Light/dark mode and English/French, both persisted in the browser.

## Stack

| Layer | Tech |
|---|---|
| API | Spring Boot 3.5.5, Java 21, Maven |
| Database | PostgreSQL (H2 in memory for tests) |
| Auth | Spring Security, OAuth2 resource server, HS256 JWT in an httpOnly cookie |
| Docs | springdoc OpenAPI / Swagger UI |
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS |
| Data fetching | SWR on the client, server components for initial loads |

## Layout

```
backend/     Spring Boot API, runs on port 3000
frontend/    Next.js app, runs on port 8080
```

The backend follows a controller / service / repository split, with entities in `model`, request and response shapes in `dtos`, and a single `GlobalExceptionHandler` that maps every exception to a JSON body with a `message` field.

## Running it

You need JDK 21, Maven 3.9+, Node 18.18+, and a running PostgreSQL.

### 1. Database

Create an empty database:

```sql
CREATE DATABASE "restaurant-management-system";
```

Tables are created on first boot from `backend/src/main/resources/schema.sql`, and sample users, stock, shifts, and notifications are seeded automatically. The seeder skips itself if the database already has users, so your data survives restarts.

### 2. Backend

```bash
cd backend
mvn spring-boot:run
```

API comes up on `http://localhost:3000`. Swagger UI is at `http://localhost:3000/swagger-ui.html`, and there is a health check at `http://localhost:3000/status`.

Defaults assume Postgres on localhost with user and password both `postgres`. Override with environment variables if yours differs:

| Variable | Default |
|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/restaurant-management-system` |
| `DB_USERNAME` | `postgres` |
| `DB_PASSWORD` | `postgres` |
| `SERVER_PORT` | `3000` |
| `FRONTEND_ORIGIN` | `http://localhost:8080` |
| `JWT_SECRET_KEY` | empty, see below |

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:8080`.

### Demo accounts

| Username | Password | Role |
|---|---|---|
| `angelo` | `angelo123` | admin |
| `hunein` | `hunein123` | employee |

Seed credentials for local development. Change them before putting this anywhere real.

## A note on the JWT secret

If `JWT_SECRET_KEY` is not set, the app generates a random 256 bit key at startup. That works fine, but it means every restart invalidates existing sessions and everyone has to log in again. For a stable local setup, generate one yourself and export it:

```bash
export JWT_SECRET_KEY=$(openssl rand -base64 32)
```

It has to be base64 and decode to at least 32 bytes, otherwise HS256 signing will refuse it and startup fails with a clear message.

## API

All routes require authentication except the four marked public. The token travels in an httpOnly `authToken` cookie, so the browser handles it and JavaScript cannot read it.

| Method | Route | Access |
|---|---|---|
| GET | `/status` | public |
| POST | `/users/signup` | public |
| POST | `/users/login` | public |
| POST | `/users/logout` | public |
| GET | `/users` | any signed in user |
| GET | `/users/{id}` | any signed in user |
| GET | `/stockItem` | any signed in user |
| POST | `/stockItem` | admin |
| POST | `/stockItem/{id}/increase` | admin |
| POST | `/stockItem/{id}/decrease` | admin |
| DELETE | `/stockItem/{id}/remove` | admin |
| GET | `/scheduleItem` | any signed in user |
| POST | `/scheduleItem/{id}/assign/{userId}` | any signed in user |
| POST | `/scheduleItem/{id}/unassign` | admin |
| GET | `/notifications/{username}` | that user, or admin |
| POST | `/notifications` | any signed in user |

Errors always come back in the same shape, which is what the frontend reads to show a useful message:

```json
{
  "timestamp": "2026-08-21T14:30:00",
  "status": 404,
  "error": "Not Found",
  "message": "Stock item with id 42 not found",
  "details": []
}
```

## Tests

```bash
cd backend
mvn test
```

Unit tests cover the services and entity validation with Mockito. Integration tests boot the full application against in memory H2 and cover the auth flow plus the error paths: expired and garbage tokens, role violations, validation failures, malformed request bodies, and missing resources.

```bash
cd frontend
npm run typecheck
npm run build
```

## Things worth knowing

Both apps run on `localhost` in development, which is what makes the cookie work across ports. If you deploy the API and the frontend to different domains, you will need to revisit the cookie domain and the route guard in `frontend/middleware.ts`, since that guard checks for the cookie's presence on the frontend's own domain.

The frontend degrades rather than crashing when the API is unreachable. Pages render, the failure is shown inline, and there are error boundaries at the route and application level as a backstop.

## Author

Angelo Mouawad
