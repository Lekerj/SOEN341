# Getting Started: Backend, DB, and Frontend

Welcome! This guide walks you through running the full ConEvents app (backend, database, frontend) from scratch. Follow each step for your OS.

---

## 1. Prerequisites

### macOS

- Install Homebrew: https://brew.sh/
- Install Node.js: `brew install node`
- Install MySQL: `brew install mysql`
- Install Python 3: `brew install python`

### Windows

- Download & install Node.js: https://nodejs.org/
- Download & install MySQL: https://dev.mysql.com/downloads/installer/
- Download & install Python 3: https://www.python.org/downloads/

---

## 2. Database Setup

1. Start MySQL server:

- **macOS:** `brew services start mysql`
- **Windows:** Use MySQL Workbench or Services panel

2. Create database and user (in MySQL shell):

```sql
CREATE DATABASE convenevents;
CREATE USER '341'@'localhost' IDENTIFIED BY 'Pass341!';
GRANT ALL PRIVILEGES ON convenevents.* TO '341'@'localhost';
FLUSH PRIVILEGES;
```

3. Create/Update tables:

- Base schema (run once per fresh database):

  ```bash
  mysql -u 341 -p convenevents < backend/sql/users_table.sql
  mysql -u 341 -p convenevents < backend/sql/events_table.sql
  mysql -u 341 -p convenevents < backend/sql/tickets_table.sql
  mysql -u 341 -p convenevents < backend/sql/moderation_logs_table.sql
  ```

- Upgrading an existing database? Append the moderation columns to `events` before starting the backend:

  ```sql
  ALTER TABLE events
    ADD COLUMN moderation_status ENUM('active','flagged','removed') NOT NULL DEFAULT 'active' AFTER image_url,
    ADD COLUMN moderation_notes TEXT NULL AFTER moderation_status,
    ADD COLUMN moderation_updated_at TIMESTAMP NULL DEFAULT NULL AFTER moderation_notes,
    ADD COLUMN moderation_updated_by INT NULL AFTER moderation_updated_at,
    ADD INDEX idx_moderation_status (moderation_status);

  ALTER TABLE events
    ADD CONSTRAINT fk_events_moderator FOREIGN KEY (moderation_updated_by)
      REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
  ```

- (Optional) Seed tables: `npm --prefix backend run seed`

---

## 3. Backend Setup

1. Install dependencies:

```
npm --prefix backend install
```

2. Configure `.env` in `backend/`:

- Set DB credentials, staff key, and mode.
- **Toggle Demo/Local Mode:**
  - Demo mode: `DEMO_MODE=1`
  - Local mode: `DEMO_MODE=0`

3. Start backend:

- **Demo mode:** `npm --prefix backend run start:demo`
- **Local mode:** `npm --prefix backend run start:local`

4. Print staff key & config:

```
npm --prefix backend run print:config
```

5. Check DB health:

```
npm --prefix backend run health:db
```

---

## 4. Frontend Setup

1. Serve frontend:

- **macOS:**
  ```
  cd frontend
  python3 -m http.server 8080
  ```
- **Windows:**
  ```
  cd frontend
  python -m http.server 8080
  ```

2. Open browser to:

- `http://localhost:8080` (local)
- `http://<LAN_IP>:8080` (LAN)

---

## 5. One-Command Demo (macOS/Linux)

Run the provided script to auto-detect LAN IP, set up `.env`, and start everything:

```bash
./start-demo.sh
```

This will print the staff key and QR base URL for sharing.

---

## 6. Administrator Moderation API

The moderation dashboard (`frontend/admin-moderation.html`) consumes a set of admin-only endpoints. Each route requires an authenticated session where the user has the `admin` role.

- `GET /api/admin/events?status=flagged&search=query` — list events with optional filters (`all`, `active`, `flagged`, `removed`) and keyword search across title, organization, or location.
- `PUT /api/admin/events/:id` — update event metadata, ticket counts, or moderation fields. All actions are timestamped and recorded.
- `DELETE /api/admin/events/:id` — soft-remove an event from public listings, append an optional note, and log the action.
- `GET /api/admin/events/:id/logs` — review the most recent moderation steps for a specific event (default 25 entries).

Every successful edit or removal writes a row into `moderation_logs`, providing a lightweight audit trail for transparency.

---

## Notes

- Staff key is required for check-in in demo mode (see config print).
- PUBLIC_WEB_BASE controls QR code URLs.
- ALLOWED_ORIGINS must include your frontend URL.
- For LAN access, set PUBLIC_WEB_BASE to your LAN IP (see shell script).
