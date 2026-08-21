CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_item (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification (
    id SERIAL PRIMARY KEY,
    message VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    stock_item_id INT,
    user_id INT,
    CONSTRAINT fk_notification_stock
        FOREIGN KEY (stock_item_id) REFERENCES stock_item(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schedule_item (
    id SERIAL PRIMARY KEY,
    day VARCHAR(20) NOT NULL,
    shift VARCHAR(20) NOT NULL,
    user_id INT,
    CONSTRAINT fk_schedule_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at);
CREATE INDEX IF NOT EXISTS idx_schedule_item_user ON schedule_item(user_id);
