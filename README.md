# ConEvents: Complete Setup & Usage Guide

Welcome! This guide will help you run the ConEvents app in either **Demo Mode** (LAN sharing for testing on phones) or **Local Mode** (localhost only). Choose your operating system and mode below.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [First-Time Database Setup](#2-first-time-database-setup)
3. [Database Update (Existing Database)](#3-database-update-existing-database)
4. [Running the App - Demo Mode](#4-running-the-app---demo-mode)
5. [Running the App - Local Mode](#5-running-the-app---local-mode)
6. [Subsequent Runs](#6-subsequent-runs)
7. [Useful Commands](#7-useful-commands)
8. [Troubleshooting](#8-troubleshooting)
9. [How to Stop Everything](#how-to-stop-everything)

---

## 1. Prerequisites

Install these tools once on your machine:

### macOS

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install node
brew install mysql
brew install python3
```

### Windows

Download and install each tool:

1. **Node.js**: https://nodejs.org/ (LTS version recommended)
2. **MySQL**: https://dev.mysql.com/downloads/installer/ (Community Edition)
3. **Python 3**: https://www.python.org/downloads/ (check "Add to PATH" during installation)

---

## 2. First-Time Database Setup

**⚠️ Only do this if you've NEVER set up the database before.**

If you already have the database but need to update it, skip to [Section 3](#3-database-update-existing-database).

### Step 1: Start MySQL Server

**macOS:**
```bash
brew services start mysql
```

**Windows:**
- Open **MySQL Workbench** and start the server, OR
- Open **Services** (Win + R, type `services.msc`) → Find "MySQL" → Click "Start"

### Step 2: Create Database and User

Open MySQL shell:

**macOS:**
```bash
mysql -u root
```

**Windows:**
```bash
mysql -u root -p
```
(Enter your MySQL root password if prompted)

Run these SQL commands:

```sql
CREATE DATABASE convenevents;
CREATE USER '341'@'localhost' IDENTIFIED BY 'Pass341!';
GRANT ALL PRIVILEGES ON convenevents.* TO '341'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Load Database Schema

Load the complete database schema using the setup file:

**macOS/Windows:**
```bash
mysql -u 341 -pPass341! convenevents < backend/sql/setup-database.sql
```

This will create all 7 tables with the complete schema:
- organizations
- users
- organization_members
- events (with is_flagged, moderation_notes, tickets_available)
- tickets (with qr_code, ticket_type)
- organizer_requests
- notifications

### Step 4: Install Dependencies

**macOS:**
```bash
npm --prefix backend install
npm --prefix frontend --no-save install http-server
```

**Windows:**
```bash
npm --prefix backend install
npm --prefix frontend --no-save install http-server
```

### Step 5: (Optional) Seed Demo Data

To create sample test data:

```bash
npm --prefix backend run seed
```

✅ **First-time setup complete!** Now choose your mode: [Demo Mode](#4-running-the-app---demo-mode) or [Local Mode](#5-running-the-app---local-mode).

---

## 3. Database Reset (Existing Database)

**Use this section if:**
- You need to reset your database to match the latest schema
- Your colleague's database is missing columns
- You want to sync with the team's working database
- You're switching branches and need to update the schema

### Step 1: Reset Database (⚠️ Warning: Existing data will be lost)

Simply reload the complete schema:

**macOS/Windows:**
```bash
mysql -u 341 -pPass341! convenevents < backend/sql/setup-database.sql
```

This will:
- Drop all existing tables
- Create all 7 tables with your exact working schema
- Restore the default organization

### Step 2: (Optional) Seed Demo Data

To repopulate sample data for testing:

```bash
npm --prefix backend run seed
```

✅ **Database reset complete!** You're now synced with the working schema.

---

## Database Schema

Your working database includes these 7 tables:

| Table | Key Columns | Purpose |
|-------|------------|---------|
| **users** | id, email, password_hash, role, organizer_auth_status | User accounts and profiles |
| **organizations** | id, name, category, is_default | Organization/club entities |
| **organization_members** | user_id, organization_id, role, status | Organization memberships |
| **events** | id, title, event_date, is_flagged, moderation_notes, tickets_available | Event listings with moderation |
| **tickets** | id, event_id, user_id, qr_code, ticket_type | Ticket bookings and check-in |
| **organizer_requests** | id, user_id, status, request_type | Organizer approval workflow |
| **notifications** | id, user_id, type, title, message, is_read | User notifications |

### Important Columns in Your Schema

**events table:**
- `is_flagged` (BOOLEAN) - Flag events for admin review ✓
- `moderation_notes` (TEXT) - Admin review notes ✓
- `tickets_available` (INT) - Track available tickets ✓

**tickets table:**
- `qr_code` (VARCHAR(255), UNIQUE) - QR code for check-in ✓
- `ticket_type` (ENUM: 'free'/'paid') - Ticket classification ✓

---

## 4. Running the App - Demo Mode

**Demo Mode** allows you to test the app on your phone or share it with others on the same Wi-Fi network.

### What Demo Mode Does:
- Backend binds to `0.0.0.0` (accessible on LAN)
- Frontend binds to `0.0.0.0` (accessible on LAN)
- QR codes use your LAN IP (e.g., `http://192.168.1.100:8080`)
- Check-in requires a staff key (security for public access)

---

### macOS - Demo Mode (One-Command Setup)

**First Run OR Rerun:**

```bash
./start-demo.sh
```

**What this script does:**
1. Auto-detects your LAN IP address
2. Creates/updates `backend/.env` with demo configuration
3. Starts backend on `http://<LAN_IP>:3000`
4. Starts frontend on `http://<LAN_IP>:8080`
5. Prints the staff key and access URLs

**✅ That's it!** The script handles everything. Access the app at the URL printed in the terminal.

**To stop:** Press `Ctrl + C` in the terminal.

---

### macOS - Demo Mode (Manual Setup)

If you prefer manual control:

**Terminal 1 - Backend:**
```bash
npm --prefix backend run start:demo
```

**Terminal 2 - Frontend:**
```bash
npx http-server frontend -p 8080 -a 0.0.0.0
```

**Optional - Seed demo data (if needed):**
```bash
npm --prefix backend run seed
```

**Access:**
- Frontend: `http://<YOUR_LAN_IP>:8080` (find your IP with `ipconfig getifaddr en0`)
- Backend: `http://<YOUR_LAN_IP>:3000`
- Staff Key: Run `npm --prefix backend run print:config` to see it

**To stop:** Press `Ctrl + C` in both terminals.

---

### Windows - Demo Mode (Manual Setup Only)

**⚠️ Note:** `start-demo.sh` is a Bash script and won't run natively on Windows. Follow manual steps:

**Step 1: Find Your LAN IP Address**

```bash
ipconfig
```

Look for `IPv4 Address` under your active network adapter (e.g., `192.168.1.100`).

**Step 2: Update `backend/.env`**

Edit `backend/.env` and set:

```env
DEMO_MODE=1
HOST=0.0.0.0
PORT=3000
STAFF_KEY=demo-staff-key
PUBLIC_WEB_BASE=http://YOUR_LAN_IP:8080
ALLOWED_ORIGINS=http://YOUR_LAN_IP:8080,http://localhost:8080
DB_HOST=localhost
DB_USER=341
DB_PASSWORD=Pass341!
DB_NAME=convenevents
SESSION_SECRET=your_secret_key_change_in_production
```

Replace `YOUR_LAN_IP` with your actual LAN IP (e.g., `192.168.1.100`).

**Step 3: Start Backend (Terminal 1)**

```bash
npm --prefix backend run start:demo
```

**Step 4: Start Frontend (Terminal 2)**

```bash
npx http-server frontend -p 8080 -a 0.0.0.0
```

**Step 5: Access the App**

- Frontend: `http://YOUR_LAN_IP:8080`
- Backend: `http://YOUR_LAN_IP:3000`
- Staff Key: `demo-staff-key` (or run `npm --prefix backend run print:config`)

**To stop:** Press `Ctrl + C` in both terminals.

---

## 5. Running the App - Local Mode

**Local Mode** runs everything on `localhost` only (no LAN access). Use this for development on your laptop.

### What Local Mode Does:
- Backend binds to `127.0.0.1` (localhost only)
- Frontend binds to `127.0.0.1` (localhost only)
- QR codes use `http://localhost:8080`
- Check-in uses session authentication (no staff key needed)

---

### macOS - Local Mode

**Terminal 1 - Backend:**
```bash
npm --prefix backend run start:local
```

**Terminal 2 - Frontend:**
```bash
python3 -m http.server 8080 --bind 127.0.0.1 --directory frontend
```

**Optional - Seed demo data (if needed):**
```bash
npm --prefix backend run seed
```

**Access:**
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3000`

**To stop:** Press `Ctrl + C` in both terminals.

---

### Windows - Local Mode

**Terminal 1 - Backend:**
```bash
npm --prefix backend run start:local
```

**Terminal 2 - Frontend:**
```bash
python -m http.server 8080 --bind 127.0.0.1 --directory frontend
```

**Alternative frontend command (if Python is `py`):**
```bash
py -m http.server 8080 --bind 127.0.0.1 --directory frontend
```

**Optional - Seed demo data (if needed):**
```bash
npm --prefix backend run seed
```

**Access:**
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3000`

**To stop:** Press `Ctrl + C` in both terminals.

---

## 6. Subsequent Runs

**If you've already set up the database and dependencies**, you only need to start the servers.

### Demo Mode (macOS)

**One-command:**
```bash
./start-demo.sh
```

**Or manually (Terminal 1 + 2):**
```bash
# Terminal 1
npm --prefix backend run start:demo

# Terminal 2
npx http-server frontend -p 8080 -a 0.0.0.0
```

### Demo Mode (Windows)

```bash
# Terminal 1
npm --prefix backend run start:demo

# Terminal 2
npx http-server frontend -p 8080 -a 0.0.0.0
```

### Local Mode (macOS)

```bash
# Terminal 1
npm --prefix backend run start:local

# Terminal 2
python3 -m http.server 8080 --bind 127.0.0.1 --directory frontend
```

### Local Mode (Windows)

```bash
# Terminal 1
npm --prefix backend run start:local

# Terminal 2
python -m http.server 8080 --bind 127.0.0.1 --directory frontend
```

---

## 7. Useful Commands

### Backend Scripts

```bash
# Check database connection health
npm --prefix backend run health:db

# Print current configuration (staff key, URLs, mode)
npm --prefix backend run print:config

# Seed/reseed demo data
npm --prefix backend run seed

# Run in development mode (auto-reload on file changes)
npm --prefix backend run dev

# Run tests
npm --prefix backend test

# Create a test user
node backend/scripts/create-test-user.js
```

### Database Commands

**Backup database:**
```bash
mysqldump -u 341 -pPass341! convenevents > backup.sql
```

**Restore database:**
```bash
mysql -u 341 -pPass341! convenevents < backup.sql
```

**Check MySQL status (macOS):**
```bash
brew services list
```

**Restart MySQL (macOS):**
```bash
brew services restart mysql
```

---

## 8. Troubleshooting

### Problem: "Cannot connect to database"

**Solution:**
1. Ensure MySQL is running:
   - **macOS:** `brew services start mysql`
   - **Windows:** Check Services panel
2. Verify credentials in `backend/.env` match your MySQL user
3. Run: `npm --prefix backend run health:db`

### Problem: "Port 3000 already in use"

**Solution:**
1. Kill the process using port 3000:
   - **macOS:** `lsof -ti:3000 | xargs kill -9`
   - **Windows:** `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`
2. Or change the port in `backend/.env`

### Problem: "Port 8080 already in use"

**Solution:**
1. Kill the process using port 8080 (same as above, replace 3000 with 8080)
2. Or use a different port: `npx http-server frontend -p 8081 -a 0.0.0.0`

### Problem: QR codes don't work on my phone

**Solution:**
1. Make sure you're in **Demo Mode** (not Local Mode)
2. Ensure phone and laptop are on the **same Wi-Fi network**
3. Run `npm --prefix backend run print:config` to verify `PUBLIC_WEB_BASE` uses your LAN IP
4. Check firewall settings (allow Node.js connections)

### Problem: "Tables already exist" when updating schema

**Solution:**
The SQL files include `DROP TABLE IF EXISTS`, so they should work. If you still get errors:

```bash
mysql -u 341 -pPass341! convenevents
```

```sql
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;
EXIT;
```

Then re-run the schema files from [Section 3](#3-database-update-existing-database).

### Problem: Dependencies out of date

**Solution:**
```bash
npm --prefix backend install
npm --prefix frontend --no-save install http-server
```

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
├── browse.html         # Event search and filtering
├── login.html          # User login page
├── register.html       # User registration page
├── profile.html        # User profile and settings
├── my-tickets.html     # User's claimed tickets
├── verify-ticket.html  # QR code verification and check-in
├── styles.css          # Shared design system stylesheet
└── utils/
    ├── api.js          # Dynamic API base configuration
    └── calendar.js     # Calendar utility functions
```

### Color Palette

- **Concordia Maroon**: `#912338` - Primary brand color
- **Concordia Purple**: `#6B2C91` - Accent color
- **Concordia Gold**: `#FFD700` - Highlight color

---

## Additional Documentation

- **QR Code System**: See [QR_CODE_SYSTEM.md](QR_CODE_SYSTEM.md) for detailed QR feature documentation
- **Backend Details**: See [backend/README.md](backend/README.md) for backend-specific information
- **Environment Variables**: See [backend/.env.example](backend/.env.example) for all configuration options

---

## Notes

- All API calls use dynamic base (no hardcoded localhost)
- For demo mode, backend must be running in demo mode and staff key is required for check-in
- `PUBLIC_WEB_BASE` controls QR code URLs
- `ALLOWED_ORIGINS` must include your frontend URL
- For LAN access, set `PUBLIC_WEB_BASE` to your LAN IP (automatically done by `start-demo.sh`)

---

## How to Stop Everything

### Stopping Servers (Both Demo and Local Mode)

**If you used `./start-demo.sh` (macOS):**
```bash
# Press Ctrl + C in the terminal where the script is running
# This will stop both backend and frontend
```

**If you're running manually (separate terminals):**
```bash
# In each terminal window (both backend and frontend):
# Press Ctrl + C
```

### Stopping MySQL Database

**Only stop MySQL if you're done working for the day or need to restart it.**

**macOS:**
```bash
# Stop MySQL service
brew services stop mysql

# Check if it's stopped
brew services list
```

**Windows:**
```bash
# Option 1: Using Services panel
# Win + R → type "services.msc" → Find "MySQL" → Click "Stop"

# Option 2: Using Command Prompt (as Administrator)
net stop MySQL
```

### Force Kill Processes (If Ctrl + C doesn't work)

**Kill Backend (Port 3000):**

**macOS:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Windows:**
```bash
# Find process ID on port 3000
netstat -ano | findstr :3000

# Kill the process (replace <PID> with the number from above)
taskkill /PID <PID> /F
```

**Kill Frontend (Port 8080):**

**macOS:**
```bash
# Find and kill process on port 8080
lsof -ti:8080 | xargs kill -9
```

**Windows:**
```bash
# Find process ID on port 8080
netstat -ano | findstr :8080

# Kill the process (replace <PID> with the number from above)
taskkill /PID <PID> /F
```

### Complete Shutdown Checklist

```bash
# 1. Stop backend (Ctrl + C or force kill port 3000)
# 2. Stop frontend (Ctrl + C or force kill port 8080)
# 3. (Optional) Stop MySQL database (see commands above)
```

**Quick verification that everything is stopped:**

**macOS:**
```bash
# Check if ports are free
lsof -ti:3000 && echo "Port 3000 still in use" || echo "Port 3000 is free"
lsof -ti:8080 && echo "Port 8080 still in use" || echo "Port 8080 is free"
brew services list | grep mysql
```

**Windows:**
```bash
# Check if ports are free
netstat -ano | findstr :3000
netstat -ano | findstr :8080
# (If no output, ports are free)
```

---

**Need help?** Check the [Troubleshooting](#8-troubleshooting) section or reach out to the team!
