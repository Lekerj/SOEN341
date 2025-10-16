# ConEvents: Complete Setup & Usage Guide

Welcome! This single README covers everything you need to run, test, and develop the ConEvents app (backend, database, frontend) from scratch. Follow each step for your OS.

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

## 2. Database Setup (first run)

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

## 3. Team Onboarding / Schema Sync

If you just pulled this branch or your schema is out of date, run these steps once to match the latest tables/data model:

1. Install/update dependencies:
   ```
   npm --prefix backend install
   npm --prefix frontend --no-save install http-server
   ```
2. Recreate the database tables (this overwrites existing table definitions):
   ```bash
   mysql -u 341 -p convenevents < backend/sql/users_table.sql
   mysql -u 341 -p convenevents < backend/sql/events_table.sql
   mysql -u 341 -p convenevents < backend/sql/tickets_table.sql
   ```
   > Tip: from inside the MySQL shell you can also run `SOURCE backend/sql/<file>.sql`.
3. (Optional) Seed demo data after the schema refresh:
   ```
   npm --prefix backend run seed
   ```

After this one-time sync you’re ready to use either local or demo mode.

---

## 4. Backend Setup

1. Install dependencies:
   ```
   npm --prefix backend install
   ```
2. Configure `.env` in `backend/`:
   - For **demo mode**, run `./start-demo.sh` once or edit `backend/.env` so it includes your LAN IP. The script auto-detects your LAN IP, enables demo sharing, and writes the file for you.
   - For **local mode**, no manual changes are needed unless you want to override defaults. `npm --prefix backend run start:local` now forces `DEMO_MODE=0`, binds the backend to `127.0.0.1`, and sets `PUBLIC_WEB_BASE`/`ALLOWED_ORIGINS` to `http://localhost:8080` so QR links stay laptop-only.
   - If you do edit manually, set your database credentials, staff key, and mode explicitly.
   - Example `.env` (for demo mode):
     ```env
     DEMO_MODE=1
     HOST=0.0.0.0
     PORT=3000
     STAFF_KEY=demo-staff-key
     PUBLIC_WEB_BASE=http://<LAN_IP>:8080
     ALLOWED_ORIGINS=http://<LAN_IP>:8080,http://localhost:8080
     DB_HOST=localhost
     DB_USER=341
     DB_PASSWORD=Pass341!
     DB_NAME=convenevents
     SESSION_SECRET=your_secret_key_change_in_production
     ```
3. Start backend:
   - **Demo mode (LAN sharing + staff key prompt):** `npm --prefix backend run start:demo`
   - **Local mode (localhost only, QR works on the same machine):** `npm --prefix backend run start:local`
4. Print staff key & config:
   ```
   npm --prefix backend run print:config
   ```
5. Check DB health:
   ```
   npm --prefix backend run health:db
   ```

---

## 5. Frontend Setup

1. Serve frontend:
   - From the project root you can run a one-liner:
     - **Local mode (laptop only):**
       ```
       python3 -m http.server 8080 --bind 127.0.0.1 --directory frontend
       ```
     - **Demo mode (share on LAN / phones, matches `start-demo.sh`):**
       ```
       npx --yes http-server frontend -p 8080 -a 0.0.0.0
       ```
     - On Windows, use `py`/`python` for the local command; the `npx` command works the same.
   - Alternatively, `cd frontend` first and drop the `--directory frontend` flag.
2. Open the frontend:
   - `http://localhost:8080` for local mode
   - `http://<LAN_IP>:8080` for demo mode (the backend prints this)

---

## 6. One-Command Demo (macOS/Linux)

Run the provided script to auto-detect LAN IP, set up `.env`, and start everything:

```bash
./start-demo.sh
```

This will print the staff key and QR base URL for sharing. The script now uses `npx http-server` for the frontend, so make sure you ran `npm --prefix frontend --no-save install http-server` during the team onboarding step (or have it cached locally).

---

## 7. Scripted E2E Smoke Test

To run a full end-to-end test (register → login → claim → verify → check-in):

- Make sure backend and frontend are running (see above)
- Use the provided `/tmp/e2e_smoke.sh` script or follow manual steps in backend README
- Capture key outputs for verification

---

## Notes

- All API calls use dynamic base (no hardcoded localhost).
- For demo mode, backend must be running in demo mode and staff key is required for check-in.
- PUBLIC_WEB_BASE controls QR code URLs.
- ALLOWED_ORIGINS must include your frontend URL.
- For LAN access, set PUBLIC_WEB_BASE to your LAN IP (see shell script).

---

## Frontend Design System

- **Concordia Brand Identity**: Uses official Concordia colors (Maroon #912338, Purple #6B2C91)
- **Student-Focused**: Clean, modern interface designed for easy event discovery and ticketing
- **Responsive Design**: Mobile-first approach that works on all devices
- **Accessibility**: High contrast, readable fonts, and semantic HTML

### File Structure

```
frontend/
├── index.html          # Home page with event listings
├── login.html          # User login page
├── register.html       # User registration page
├── styles.css          # Shared design system stylesheet
└── README.md           # This documentation
```

### Color Palette

- **Concordia Maroon**: `#912338` - Primary brand color
- **Concordia Purple**: `#6B2C91` - Accent color
- **Concordia Gold**: `#FFD700` - Highlight color
