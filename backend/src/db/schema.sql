PRAGMA foreign_keys = ON;

-- 1. Пользователи системы (менеджеры, супервайзеры, администраторы)
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone         TEXT,
    role          TEXT NOT NULL CHECK (role IN ('manager', 'supervisor', 'admin')),
    is_active     INTEGER NOT NULL DEFAULT 1,
    supervisor_id TEXT REFERENCES users(id),
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
);

-- 2. Компании (юридические лица)
CREATE TABLE IF NOT EXISTS companies (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    inn        TEXT,
    address    TEXT,
    phone      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Контакты (физические лица; status='lead' — лид на раннем этапе)
CREATE TABLE IF NOT EXISTS contacts (
    id              TEXT PRIMARY KEY,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    middle_name     TEXT,
    phone           TEXT,
    email           TEXT,
    position        TEXT,
    company_id      TEXT REFERENCES companies(id),
    status          TEXT NOT NULL DEFAULT 'lead'
                        CHECK (status IN ('lead', 'active', 'regular', 'archived')),
    source          TEXT,
    manager_id      TEXT NOT NULL REFERENCES users(id),
    tags            TEXT,           -- JSON array: ["оптовик","строительство"]
    comment         TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_contact_at TEXT
);

-- 4. Сделки
CREATE TABLE IF NOT EXISTS deals (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    contact_id  TEXT REFERENCES contacts(id),
    company_id  TEXT REFERENCES companies(id),
    manager_id  TEXT NOT NULL REFERENCES users(id),
    status      TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','negotiation','proposal_sent',
                                      'awaiting_payment','won','lost')),
    amount      REAL,
    deadline    TEXT,
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. История изменений статуса сделки
CREATE TABLE IF NOT EXISTS deal_status_changes (
    id          TEXT PRIMARY KEY,
    deal_id     TEXT NOT NULL REFERENCES deals(id),
    from_status TEXT,
    to_status   TEXT NOT NULL,
    changed_by  TEXT NOT NULL REFERENCES users(id),
    changed_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Активности / журнал взаимодействий
CREATE TABLE IF NOT EXISTS activities (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL CHECK (type IN ('call','email','meeting','note','status_change')),
    manager_id  TEXT NOT NULL REFERENCES users(id),
    contact_id  TEXT REFERENCES contacts(id),
    deal_id     TEXT REFERENCES deals(id),
    date        TEXT NOT NULL,
    description TEXT NOT NULL,
    result      TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Задачи (внутренние задачи менеджера)
CREATE TABLE IF NOT EXISTS tasks (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    description  TEXT,
    status       TEXT NOT NULL DEFAULT 'new'
                     CHECK (status IN ('new','in_progress','done')),
    priority     TEXT NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('low','medium','high')),
    assignee_id  TEXT NOT NULL REFERENCES users(id),
    contact_id   TEXT REFERENCES contacts(id),
    deal_id      TEXT REFERENCES deals(id),
    deadline     TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);

-- 8. Заявки (входящие запросы от клиентов)
CREATE TABLE IF NOT EXISTS requests (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','in_progress','resolved','closed')),
    contact_id  TEXT REFERENCES contacts(id),
    deal_id     TEXT REFERENCES deals(id),
    assignee_id TEXT REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at   TEXT
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_contacts_manager   ON contacts(manager_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company   ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status    ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_deals_manager      ON deals(manager_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact      ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_status       ON deals(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee     ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal    ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_requests_contact   ON requests(contact_id);
CREATE INDEX IF NOT EXISTS idx_requests_deal      ON requests(deal_id);
