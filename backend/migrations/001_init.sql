CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL,
    title VARCHAR(500) NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    subject VARCHAR(100) NOT NULL,
    submission_type VARCHAR(100) NOT NULL,
    submission_link TEXT,
    effort_level INTEGER NOT NULL CHECK (effort_level BETWEEN 1 AND 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (id, user_id)
);

CREATE INDEX tasks_user_due_date_idx
    ON tasks (user_id, due_date);

CREATE INDEX tasks_user_completed_due_date_idx
    ON tasks (user_id, is_completed, due_date);


CREATE TABLE user_settings (
    user_id VARCHAR(128) PRIMARY KEY,
    discord_webhook_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE reminder_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    days_before INTEGER NOT NULL CHECK (days_before IN (1, 3, 7)),
    sent_at TIMESTAMPTZ,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (task_id, days_before),
    FOREIGN KEY (task_id, user_id)
        REFERENCES tasks (id, user_id)
        ON DELETE CASCADE
);

CREATE INDEX reminder_deliveries_pending_idx
    ON reminder_deliveries (sent_at, task_id);