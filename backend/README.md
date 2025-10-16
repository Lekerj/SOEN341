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

3. (Optional) Seed tables: `npm --prefix backend run seed`

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

## Notes

- Staff key is required for check-in in demo mode (see config print).
- PUBLIC_WEB_BASE controls QR code URLs.
- ALLOWED_ORIGINS must include your frontend URL.
- For LAN access, set PUBLIC_WEB_BASE to your LAN IP (see shell script).
