# 🚀 Quick Start Guide - ConEvents

## Prerequisites

- ✅ Backend server running on `http://localhost:3000`
- ✅ MySQL database with `convenevents` database and `users` table
- ✅ Modern web browser (Chrome, Firefox, Safari, Edge)

## 🎯 How to Run the Application

### Step 1: Start the Backend Server (If Not Running)

```bash
cd backend
node server.js
```

You should see: `Server running on http://localhost:3000`

### Step 2: Open the Frontend

**Option A: Using VS Code Live Server (Recommended)**

1. Install the "Live Server" extension in VS Code
2. Right-click on `frontend/index.html`
3. Select "Open with Live Server"
4. Browser will open at `http://localhost:5500` or similar

**Option B: Using Python HTTP Server**

```bash
cd frontend
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser

**Option C: Using Node HTTP Server**

```bash
# Install http-server globally (one time)
npm install -g http-server

# Run from frontend directory
cd frontend
http-server -p 8080
```

Then open `http://localhost:8080` in your browser

**Option D: Direct File Opening (May have CORS issues)**

Simply open `frontend/index.html` in your browser. Note: Some features may not work due to CORS restrictions.

## 🔍 What You'll See

### Home Page (index.html)

- **Hero Section**: Welcome message with call-to-action buttons
- **Event Grid**: 6 sample events with details:
  - Tech Innovation Summit - $15.00
  - Art & Design Showcase - FREE
  - Fall Music Festival - $10.00
  - Charity Run for Education - $20.00
  - Career Fair 2025 - FREE
  - Halloween Bash - $12.00
- **About Section**: Information about ConEvents
- **Navigation Bar**: Links to Home, Events, About, Login, Sign Up

### Features Available

#### For Guest Users:

- ✅ Browse all events
- ✅ View event details (date, time, location, price, capacity)
- ❌ Cannot purchase tickets (must login)

#### For Logged-In Users:

- ✅ Browse all events
- ✅ Purchase/reserve tickets
- ✅ View profile in navigation bar
- ✅ Logout functionality

## 📝 Testing the Full Flow

### 1. Register a New Account

1. Click "Sign Up" or "Create Account"
2. Fill in the registration form:
   - Full Name: Your Name
   - Email: yourname@example.com
   - Password: (minimum 6 characters)
   - Role: Student / Event Organizer / Administrator
3. Click "Create Account"
4. You'll be redirected to login page

### 2. Login

1. Enter your email and password
2. Click "Login"
3. You'll be redirected to home page
4. Notice the navbar now shows "Welcome, [Your Name]!" and Logout button

### 3. Purchase Tickets

1. Browse the event cards
2. Click "Get Tickets" on any event
3. Confirm the purchase in the popup
4. Success message will appear

### 4. Logout

1. Click "Logout" in the navigation bar
2. You'll be logged out and page will refresh
3. Navbar will show "Login" and "Sign Up" again

## 🎨 Design Features

### Concordia Branding

- **Colors**: Official Concordia Maroon (#912338) and Purple (#6B2C91)
- **Typography**: Clean, professional fonts
- **Icons**: Emoji-based for universal compatibility

### Responsive Design

- ✅ Mobile-friendly (< 768px)
- ✅ Tablet optimized (768px - 1024px)
- ✅ Desktop enhanced (> 1024px)

### User Experience

- **Smooth Animations**: Hover effects, transitions
- **Clear Feedback**: Success/error messages
- **Consistent Design**: Shared stylesheet across all pages
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation

## 🔧 Troubleshooting

### "Please login to purchase tickets!"

➡️ You need to login or create an account first

### CORS Error in Console

➡️ Use Live Server or HTTP server instead of opening HTML directly

### Backend Connection Failed

➡️ Make sure backend server is running on port 3000

### Session Expired

➡️ Login again - sessions last 24 hours

### Styles Not Loading

➡️ Make sure `styles.css` is in the same directory as HTML files

## 📊 Current Test Data

If you used the test scripts from earlier, these test accounts exist:

**Test User 1:**

- Email: test@example.com
- Password: testpass123
- Role: Student

**Test User 2:**

- Email: john@test.com
- Password: password123
- Role: Organizer

## 🎯 Next Steps (Future Development)

### Backend (To Implement)

- [ ] Events table and API endpoints
- [ ] Tickets/reservations table
- [ ] Payment processing integration
- [ ] Email notifications
- [ ] Admin dashboard

### Frontend (To Implement)

- [ ] Event details page
- [ ] User dashboard/profile page
- [ ] My Tickets page
- [ ] Event creation form (for organizers)
- [ ] Search and filter functionality
- [ ] Payment checkout page

## 📚 File Structure

```
SOEN341/
├── backend/
│   ├── server.js              # Express server with CORS
│   ├── config/
│   │   └── db.js             # MySQL connection
│   ├── routes/
│   │   └── auth.js           # Authentication routes
│   ├── middleware/
│   │   └── auth.js           # Auth middleware
│   └── sql/
│       └── users_table.sql   # Database schema
│
└── frontend/
    ├── index.html            # Home page (events showcase)
    ├── login.html            # Login page
    ├── register.html         # Registration page
    ├── styles.css            # Shared design system
    └── README.md             # Design documentation
```

## ✅ Completed Features (Sprint 2)

- ✅ User registration with bcrypt password hashing
- ✅ User login with session management
- ✅ Protected routes and authentication middleware
- ✅ Beautiful, responsive frontend with Concordia branding
- ✅ Consistent design system across all pages
- ✅ Event showcase with sample data
- ✅ CORS-enabled backend for frontend communication

## 🎉 Enjoy ConEvents!

Your Concordia University Event Ticketing Platform is ready to use. Happy event browsing! 🎫
