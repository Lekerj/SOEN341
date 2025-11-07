# ConEvents Database: Schema and Reset Guide

This document captures the current MySQL schema expected by the backend and provides a clean reset path so every teammate can match the same database structure locally.

- DB: MySQL
- Default DB name: `convenevents`
- Default user: `341` / `Pass341!`
- Connection file: `backend/config/db.js`
- Authoritative setup: `backend/scripts/reset-database.js` (uses `backend/sql/*.sql`)

If your database differs (errors like “Unknown column 'tickets_available'” or “Unknown column 'qr_code'”), follow the Reset section below.

---

## Environment variables (backend/.env)

Recommended minimal `.env` for local/demo:

```
DB_HOST=localhost
DB_USER=341
DB_PASSWORD=Pass341!
DB_NAME=convenevents

# Demo conveniences and CORS
DEMO_MODE=1
SESSION_SECRET=dev-session-secret
STAFF_KEY=demo-staff-key
ALLOWED_ORIGINS=http://localhost:8080
PUBLIC_WEB_BASE=http://localhost:8080
```

- DEMO_MODE=1: allows QR check-ins with a simple `x-staff-key` header.
- PUBLIC_WEB_BASE: used to generate QR codes that link to the frontend `verify-ticket.html`.

---

## Current schema (tables, key columns, indexes)

The app expects the following structure (source: `backend/sql/*.sql`):

### organizations
- id INT PK AUTO_INCREMENT
- name VARCHAR(100) UNIQUE NOT NULL
- description TEXT
- category ENUM('sports','academic','social','club') NOT NULL
- is_default BOOLEAN DEFAULT TRUE
- logo_url VARCHAR(500)
- created_at TIMESTAMP, updated_at TIMESTAMP
- Indexes: `idx_category`, `idx_is_default`

### users
- id INT PK AUTO_INCREMENT
- name VARCHAR(100) NOT NULL
- email VARCHAR(255) UNIQUE NOT NULL
- password_hash VARCHAR(255) NOT NULL
- role VARCHAR(50) DEFAULT 'student'
- profile_pic_url VARCHAR(500) DEFAULT default pfp URL
- organizer_auth_status ENUM('null','pending','approved','refused')
- organization_id INT NULL (FK → organizations.id, ON DELETE SET NULL)
- organization_role ENUM('Member','Event Manager','Vice President','President') DEFAULT 'Member'
- request_date TIMESTAMP NULL
- approval_date TIMESTAMP NULL
- created_at TIMESTAMP, updated_at TIMESTAMP
- Index: `idx_organizer_auth_status`

### events
- id INT PK AUTO_INCREMENT
- title VARCHAR(255) NOT NULL
- description TEXT (may be LONGTEXT in some scripts)
- event_date DATE NOT NULL
- event_time TIME NOT NULL (some variants allow NULL; frontend handles both)
- location VARCHAR(255) NOT NULL
- price DECIMAL(10,2) DEFAULT 0.00
- category ENUM('sports','academic','social','club') DEFAULT 'social'
- organization VARCHAR(100) DEFAULT 'General'
- organizer_id INT NULL (FK → users.id, ON DELETE SET NULL)
- capacity INT NOT NULL DEFAULT 0
- tickets_available INT NOT NULL DEFAULT 0
- image_url VARCHAR(500) (optional)
- created_at TIMESTAMP, updated_at TIMESTAMP
- Indexes: `idx_event_date`, `idx_category`, `idx_organizer_id`, `idx_organization`

### tickets
- id INT PK AUTO_INCREMENT
- user_id INT NOT NULL (FK → users.id, ON DELETE CASCADE)
- event_id INT NOT NULL (FK → events.id, ON DELETE CASCADE)
- ticket_type ENUM('free','paid') DEFAULT 'free'
- qr_code VARCHAR(255) UNIQUE
- purchaser_name VARCHAR(100) NULL
- purchaser_email VARCHAR(255) NULL
- checked_in BOOLEAN DEFAULT FALSE
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- Unique: `(user_id, event_id)` (prevent duplicate claims for the same event)

### organizer_requests
- id INT PK AUTO_INCREMENT
- user_id INT NOT NULL (FK → users.id, ON DELETE CASCADE)
- organization_id INT NULL (FK → organizations.id, ON DELETE SET NULL)
- request_type ENUM('join','create') (some scripts include 'organizer')
- status ENUM('pending','refused','approved') DEFAULT 'pending'
- details TEXT
- created_at TIMESTAMP, updated_at TIMESTAMP
- Indexes: `idx_user_id`, `idx_organization_id`, `idx_status`

### organization_members
- id INT PK AUTO_INCREMENT
- user_id INT NOT NULL (FK → users.id, ON DELETE CASCADE)
- organization_id INT NOT NULL (FK → organizations.id, ON DELETE CASCADE)
- role ENUM('Member','Event Manager','Vice President','President') DEFAULT 'Member'
- status ENUM('active','pending','refused') DEFAULT 'active'
- assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- Unique: `(user_id, organization_id)`

### notifications
- id INT PK AUTO_INCREMENT
- user_id INT NULL (FK → users.id, ON DELETE SET NULL)
- audience ENUM('admin','user') DEFAULT 'user'
- type ENUM('organizer_request','request_approved','request_refused')
- title VARCHAR(150)
- message VARCHAR(500)
- related_user_id INT NULL (FK → users.id)
- related_organization_id INT NULL (FK → organizations.id)
- related_status ENUM('pending','approved','refused') NULL
- is_read BOOLEAN DEFAULT FALSE
- read_at TIMESTAMP NULL
- created_at TIMESTAMP, updated_at TIMESTAMP
- Indexes: `idx_user_audience`, `idx_audience`, `idx_is_read`, `idx_type`, `idx_created_at`

---

## Reset and seed (everyone gets the same DB)

1) Ensure MySQL is running (macOS):

```zsh
brew services start mysql
```

2) Create DB and user (first-time only, in MySQL shell):

```sql
CREATE DATABASE convenevents;
CREATE USER '341'@'localhost' IDENTIFIED BY 'Pass341!';
GRANT ALL PRIVILEGES ON convenevents.* TO '341'@'localhost';
FLUSH PRIVILEGES;
```

3) Configure `backend/.env` (see above), then install deps:

```zsh
npm --prefix backend install
```

4) Reset the database (DROPS ALL DATA, RECREATES TABLES, SEEDS):

```zsh
node backend/scripts/reset-database.js
```

What this script does:
- Drops all tables (FK-safe order)
- Recreates tables from `backend/sql/*.sql`
- Seeds organizations and test users
- Optionally seeds sample events if `backend/sql/seed_events.sql` exists

5) Verify quickly:

```sql
USE convenevents;
SHOW TABLES;
DESCRIBE users;
DESCRIBE events;
DESCRIBE tickets;
```

You should see `events.tickets_available` and `tickets.qr_code` + `tickets.ticket_type`.

---

## Test accounts created by reset script

- Admin: `admin@concordia.ca` / `Admin123!`
- Student: `student@test.com` / `Student123!`
- Organizer (unapproved): `organizer@test.com` / `Organizer123!`
- Organizer (approved): `approved@test.com` / `Approved123!`

---

## Common mismatches and fixes

- Error: Unknown column `tickets_available` → Your DB was created with an old script. Run the reset script above.
- Error: Unknown column `ticket_code` / missing `qr_code` → You have the old tickets schema. Run the reset script above.
- CORS/QR callbacks failing → Ensure `ALLOWED_ORIGINS` and `PUBLIC_WEB_BASE` include your frontend URL (e.g., `http://localhost:8080`).

---

## Start the app

- Backend:

```zsh
npm --prefix backend run start:demo   # or: npm --prefix backend run start:local
```

- Frontend:

```zsh
cd frontend
python3 -m http.server 8080
```

Open http://localhost:8080

---

Maintainer note: The single source of truth for schema is the reset script + SQL in `backend/sql/`. Avoid using legacy `initialize-db.js` or `setup-database.sql` unless they are updated to match the current schema.
