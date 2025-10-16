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
   - If you use the `start-demo.sh` script, `.env` is auto-generated for demo mode and LAN sharing—no manual editing needed.
   - If you want to customize or run in local mode, edit `backend/.env` manually:
     - Set your database credentials, staff key, and mode.
     - To run in demo mode, set: `DEMO_MODE=1`
     - To run in local mode, set: `DEMO_MODE=0`
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

## 6. Scripted E2E Smoke Test

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
