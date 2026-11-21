# Restaurant Management System

Runs the day to day side of a restaurant: who works when, what's in the kitchen, what needs ordering, and who needs to know about it.

Started as a university **Scrum team project at UCLL**. A Spring Boot REST API on one side, a Next.js App Router frontend on the other, and JWT authentication in an httpOnly cookie between them.

## What it does

**Three roles, enforced by the API.**

| Role | What they can do |
|---|---|
| Admin | Everything a manager can, plus create, edit, deactivate and remove managers and employees. |
| Manager | Create, edit, deactivate and remove employees. Plan the schedule, manage stock, suppliers and orders. |
| Employee | Enter availability, see their own published schedule, read their notifications. |

Every endpoint states its roles with `@PreAuthorize`, and the services add the finer rules (a manager can only touch employees, nobody manages their own account through the team routes). The role and active flag are read from the database on every request, so a deactivated user is signed out at once and a role change applies on their next click. The navigation only shows what a role can use.

**Shift planning.**
1. **Availability.** Employees mark days as available, preferred or unavailable, optionally with a time window and a note. They can select a whole week, copy a week onto later weeks, or apply a recurring weekly pattern. They can keep changing it until a manager locks that week.
2. **Planning.** Managers see a grid with employees as rows and days as columns, coloured by availability. They assign shifts by clicking a cell or dragging a shift to another person or day. The board flags people booked on days they can't work, double bookings (always refused), weeks over someone's maximum hours, and shift types without enough staff. Saving something that raises a warning asks for confirmation first.
3. **Draft, then published.** A week stays a draft only managers can see. Publishing makes it visible to the employees in it and notifies each of them. Any later change is written to the week's change log and sent to the people it affects.
4. **Employee view.** A month calendar and a list view of published shifts, with total hours per week. Works on a phone.

Shift types (morning, lunch rush, evening, closing, or any custom one) have times, the weekdays they run on, and a minimum number of staff. A single shift can also use custom times.

**Stock.**
- Items have a category, unit, quantity, minimum threshold, supplier and cost per unit.
- Quantities are never overwritten. Every change is a movement (delivery, usage, waste, correction) with a reason, the user and a timestamp, written in the same transaction as the new total and with the item row locked.
- Dropping below the threshold notifies managers and admins.
- Purchase orders go from draft to ordered to received. Receiving books every line into stock in one transaction, and it can't happen twice.
- The stock page shows total value, items below their minimum and recent movements, and has search, category filters, sorting and paging. Each item has its own history.

**Notifications.** Stored per person, with read and unread state, a badge in the header, mark as read and mark all as read. They are raised by domain events inside the services, never by the browser:

| Event | Who is notified |
|---|---|
| An employee saves availability | Their manager (or every manager if they have none) |
| A week is published | Every employee in it |
| A published shift is added, moved or cancelled | The employee affected |
| Stock drops below its minimum | Managers and admins |
| A purchase order is received | Managers and admins |
| An account is created, or its role changes | That person |

Each notification links to the page to act on. French readers see them rebuilt in French from the values they were made from.

**Profiles.** Everyone has a profile with name, role, position, join date and initials. Employees see their upcoming shifts; managers see their team. Contact details are only visible to management and the person themselves. Everyone can edit their own name, email and phone, and change their password.

**Theme and language.** Light and dark mode, English and French.

## Stack

| Layer | Tech |
|---|---|
| API | Spring Boot 3.5, Java 21, Maven |
| Database | PostgreSQL with Flyway migrations (H2 in memory for tests) |
| Auth | Spring Security, OAuth2 resource server, HS256 JWT in an httpOnly cookie |
| Docs | springdoc OpenAPI / Swagger UI |
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS, lucide-react icons |
| Data fetching | SWR |

## Layout

```
backend/
  src/main/java/.../backend/
    controller/     REST endpoints, one per area, each method with its roles
    service/        business rules and transactions
    repository/     Spring Data repositories
    model/          JPA entities
    dtos/           request and response records, with validation
    events/         domain events and the listener that turns them into notifications
    config/         security, JWT, CORS, OpenAPI
  src/main/resources/db/migration/   Flyway migrations
frontend/
  app/              routes: home, schedule (my, availability, planning, shift-types), stock (items,
                    movements, orders, suppliers), team, notifications, profile
  components/       ui/ is the shared kit (buttons, tables, dialogs, skeletons, empty and error states)
  locales/          English and French text
  services/         API calls
```

## Running it

You need JDK 21+, Maven 3.9+, Node 18.18+, and PostgreSQL.

### 1. Database

Create an empty database:

```sql
CREATE DATABASE "restaurant-management-system";
```

Or run one in Docker:

```bash
docker run -d --name rms-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=restaurant-management-system -p 5432:5432 postgres:16-alpine
```

Flyway creates the schema on first boot. A database from the previous version of this app is upgraded in place: its users (guests become employees), stock items and notifications are kept, and the old weekday shift slots are replaced by dated shifts.

### 2. Backend

```bash
cd backend
mvn spring-boot:run
```

The API runs on `http://localhost:3000`, with Swagger UI at `http://localhost:3000/swagger-ui.html` and a health check at `/status`. On first start it fills the database with demo data (see below). Each part of the demo data only runs when its tables are empty, so restarts keep your changes.

| Variable | Default |
|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/restaurant-management-system` |
| `DB_USERNAME` | `postgres` |
| `DB_PASSWORD` | `postgres` |
| `SERVER_PORT` | `3000` |
| `FRONTEND_ORIGIN` | `http://localhost:8080` |
| `JWT_SECRET_KEY` | empty, see below |
| `SEED_DEMO_DATA` | `true`; set to `false` to start empty |

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:8080`.

### Tests

```bash
cd backend
mvn test
```

The integration tests cover role checks, contact privacy, deactivation, drafts staying hidden until published, conflict warnings and double booking, the change log, availability locking, stock movements and low stock alerts, and receiving orders.

## Demo accounts

Every password is the username followed by `123`.

| Username | Role | Notes |
|---|---|---|
| `angelo` | Admin | Owner |
| `sara` | Manager | Floor manager, team: Hunein, Lina, Youssef, Emma |
| `tom` | Manager | Kitchen manager, team: Noah, Mila, Lucas, Nora |
| `hunein`, `lina`, `youssef`, `emma` | Employee | Front of house |
| `noah`, `mila`, `lucas`, `nora` | Employee | Kitchen |

The demo data:
- **Schedule:** last week and this week are published. Next week is a draft with availability locked, a few gaps, and one deliberate conflict (Hunein on the day of his exam). The week after is still empty.
- **Availability:** about five weeks of availability for most employees. Nora only filled in three.
- **Stock:** 30 stock items with four weeks of history, several of them below their minimum, from 4 suppliers.
- **Orders:** one in each state. The one from Slagerij Peeters is on its way and can be received.

These are local development credentials. Change them before putting this anywhere real.

## A note on the JWT secret

If `JWT_SECRET_KEY` is not set, the app generates a random 256 bit key at startup. That works, but every restart signs everyone out. For a stable setup, generate one and export it:

```bash
export JWT_SECRET_KEY=$(openssl rand -base64 32)
```

It has to be base64 and decode to at least 32 bytes, otherwise startup stops with a clear message.

## API overview

All routes need a signed-in user except `/status`, `/auth/login` and `/auth/logout`. Swagger UI lists every route with its request and response shapes.

| Area | Routes | Roles |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | public / any |
| Users | `GET /users`, `GET /users/{id}`, `GET /users/{id}/profile`, `PUT /users/me`, `PUT /users/me/password` | any (contact details filtered) |
| Users | `POST /users`, `PUT /users/{id}`, `PATCH /users/{id}/active`, `DELETE /users/{id}`, `GET /users/managers` | admin, manager |
| Availability | `GET/PUT /availability/me`, `POST /availability/me/copy-week`, `POST /availability/me/recurring` | employee |
| Availability | `GET /availability` | admin, manager |
| Schedule | `GET /schedule/me` | employee |
| Schedule | `GET /schedule/planning`, `GET /schedule/periods`, `POST/PUT/DELETE /schedule/shifts`, `POST /schedule/periods/{week}/publish`, `/lock`, `/unlock`, `GET /schedule/periods/{week}/changes` | admin, manager |
| Shift types | `GET /shift-types` | any |
| Shift types | `POST/PUT/DELETE /shift-types` | admin, manager |
| Stock | `/stock/overview`, `/stock/items`, `/stock/items/{id}/movements`, `/stock/movements`, `/stock/suppliers`, `/stock/orders` and their actions | admin, manager |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all` | own only |

Errors always have the same shape: `status`, `error`, `message`, a stable `code` where it helps (for example `SHIFT_WARNINGS`, `SHIFT_DOUBLE_BOOKED`, `INSUFFICIENT_STOCK`) and `details`.
