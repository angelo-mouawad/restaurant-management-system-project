-- Turns the original schema into the full restaurant operations model.
-- Existing users, stock items and notifications are carried over. The old weekday schedule slots have no
-- dates, so they cannot be mapped onto the new dated shifts and are dropped.

-- ---------------------------------------------------------------- users and roles
ALTER TABLE users ADD COLUMN email VARCHAR(255);
ALTER TABLE users ADD COLUMN phone VARCHAR(50);
ALTER TABLE users ADD COLUMN position VARCHAR(100);
ALTER TABLE users ADD COLUMN max_weekly_hours INT NOT NULL DEFAULT 38;
ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN joined_at DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE users ADD COLUMN manager_id INT;
ALTER TABLE users ADD CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- Guests no longer exist. They become employees.
UPDATE users SET role = UPPER(role);
UPDATE users SET role = 'EMPLOYEE' WHERE role NOT IN ('ADMIN', 'MANAGER', 'EMPLOYEE');
ALTER TABLE users ADD CONSTRAINT ck_users_role CHECK (role IN ('ADMIN', 'MANAGER', 'EMPLOYEE'));
ALTER TABLE users ADD CONSTRAINT ck_users_hours CHECK (max_weekly_hours BETWEEN 1 AND 80);
CREATE UNIQUE INDEX ux_users_email ON users (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX idx_users_manager ON users(manager_id);

-- ---------------------------------------------------------------- scheduling
DROP TABLE IF EXISTS schedule_item;

CREATE TABLE shift_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    min_staff INT NOT NULL DEFAULT 1,
    -- The weekdays this shift runs on, for example 'FRIDAY,SATURDAY'.
    days VARCHAR(80) NOT NULL DEFAULT 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY',
    color VARCHAR(20) NOT NULL DEFAULT 'teal',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_shift_type_staff CHECK (min_staff BETWEEN 0 AND 50)
);

CREATE TABLE availability (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    start_time TIME,
    end_time TIME,
    note VARCHAR(500),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT ux_availability_user_date UNIQUE (user_id, date),
    CONSTRAINT ck_availability_status CHECK (status IN ('AVAILABLE', 'PREFERRED', 'UNAVAILABLE'))
);
CREATE INDEX idx_availability_date ON availability(date);

-- One row per ISO week, created the first time a week is planned.
CREATE TABLE schedule_period (
    id SERIAL PRIMARY KEY,
    week_start DATE NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    availability_locked BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMP,
    published_by INT REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_period_status CHECK (status IN ('DRAFT', 'PUBLISHED'))
);

CREATE TABLE shift (
    id SERIAL PRIMARY KEY,
    period_id INT NOT NULL REFERENCES schedule_period(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift_type_id INT REFERENCES shift_type(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    note VARCHAR(500),
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shift_date ON shift(date);
CREATE INDEX idx_shift_user_date ON shift(user_id, date);

-- Every change made to a week after it was published.
CREATE TABLE shift_change (
    id SERIAL PRIMARY KEY,
    period_id INT NOT NULL REFERENCES schedule_period(id) ON DELETE CASCADE,
    affected_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    changed_by INT REFERENCES users(id) ON DELETE SET NULL,
    change_type VARCHAR(20) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shift_change_period ON shift_change(period_id);

-- ---------------------------------------------------------------- stock
CREATE TABLE supplier (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    lead_time_days INT NOT NULL DEFAULT 2
);

ALTER TABLE stock_item ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'OTHER';
ALTER TABLE stock_item ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'PIECE';
ALTER TABLE stock_item ALTER COLUMN quantity TYPE NUMERIC(12, 3);
ALTER TABLE stock_item ADD COLUMN min_threshold NUMERIC(12, 3) NOT NULL DEFAULT 10;
ALTER TABLE stock_item ADD COLUMN supplier_id INT REFERENCES supplier(id) ON DELETE SET NULL;
ALTER TABLE stock_item ADD COLUMN cost_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE stock_item ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE stock_item ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE stock_item ADD CONSTRAINT ck_stock_quantity CHECK (quantity >= 0);
ALTER TABLE stock_item ADD CONSTRAINT ck_stock_threshold CHECK (min_threshold >= 0);

CREATE TABLE purchase_order (
    id SERIAL PRIMARY KEY,
    supplier_id INT NOT NULL REFERENCES supplier(id),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    note VARCHAR(1000),
    expected_at DATE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ordered_at TIMESTAMP,
    received_at TIMESTAMP,
    received_by INT REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_po_status CHECK (status IN ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'))
);

CREATE TABLE purchase_order_line (
    id SERIAL PRIMARY KEY,
    purchase_order_id INT NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    stock_item_id INT NOT NULL REFERENCES stock_item(id),
    quantity NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL,
    CONSTRAINT ck_po_line_quantity CHECK (quantity > 0)
);

-- Quantities are never overwritten: every change is a movement, and the item keeps the running total.
CREATE TABLE stock_movement (
    id SERIAL PRIMARY KEY,
    stock_item_id INT NOT NULL REFERENCES stock_item(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    quantity_change NUMERIC(12, 3) NOT NULL,
    quantity_after NUMERIC(12, 3) NOT NULL,
    reason VARCHAR(500),
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    purchase_order_id INT REFERENCES purchase_order(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_movement_type CHECK (type IN ('INITIAL', 'DELIVERY', 'USAGE', 'WASTE', 'CORRECTION'))
);
CREATE INDEX idx_movement_item ON stock_movement(stock_item_id, created_at);
CREATE INDEX idx_movement_created ON stock_movement(created_at);

-- Existing quantities become an opening balance, so every item has a complete history.
INSERT INTO stock_movement (stock_item_id, type, quantity_change, quantity_after, reason, created_at)
SELECT id, 'INITIAL', quantity, quantity, 'Opening balance carried over from the previous system', NOW()
FROM stock_item;

-- ---------------------------------------------------------------- notifications
ALTER TABLE notification DROP CONSTRAINT IF EXISTS fk_notification_stock;
ALTER TABLE notification DROP COLUMN IF EXISTS stock_item_id;
DELETE FROM notification WHERE user_id IS NULL;
ALTER TABLE notification ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE notification ADD COLUMN type VARCHAR(40) NOT NULL DEFAULT 'GENERAL';
ALTER TABLE notification ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT 'Notice';
ALTER TABLE notification ADD COLUMN params VARCHAR(2000);
ALTER TABLE notification ADD COLUMN link VARCHAR(500);
ALTER TABLE notification ADD COLUMN read_at TIMESTAMP;
CREATE INDEX idx_notification_unread ON notification(user_id, read_at);
