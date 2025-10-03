# ConEvents Backend - Authentication Setup

## Prerequisites

- Node.js installed
- MySQL installed and running
- MySQL Workbench (optional, for database management)

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Database

1. Open MySQL Workbench or your MySQL client
2. Create a new database:
   ```sql
   CREATE DATABASE convenevents;
   ```
3. Run the SQL schema file:
   ```bash
   mysql -u root -p convenevents < sql/users_table.sql
   ```
   Or copy the contents of `sql/users_table.sql` and run it in MySQL Workbench.

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and update with your MySQL credentials:
   ```
   DB_HOST=localhost
   DB_USER=341
   DB_PASSWORD=341
   DB_NAME=convenevents
   SESSION_SECRET=generate_a_random_secret_here
   ```

### 4. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Authentication Endpoints

#### Register a New User

- **POST** `/api/auth/register`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "student"
  }
  ```
- **Response:** `201 Created`

#### Login

- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:** User object with session created

#### Get Current User Profile

- **GET** `/api/auth/profile`
- **Requires:** Active session (must be logged in)
- **Response:** User profile data

#### Logout

- **POST** `/api/auth/logout`
- **Response:** Success message

## Testing with cURL

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123","role":"student"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -c cookies.txt
```

### Get Profile (with session)

```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -b cookies.txt
```

### Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

## File Structure

```
backend/
├── config/
│   └── db.js              # Database connection configuration
├── middleware/
│   └── auth.js            # Authentication middleware
├── routes/
│   └── auth.js            # Authentication routes
├── sql/
│   └── users_table.sql    # Database schema
├── .env.example           # Environment variables template
├── server.js              # Main server file
└── package.json           # Dependencies
```

## Security Notes

- Passwords are hashed using bcrypt with 10 salt rounds
- Sessions are managed with express-session
- Change SESSION_SECRET in production to a strong random string
- Use HTTPS in production (set cookie.secure to true)
- Email validation is performed on registration
- Passwords must be at least 6 characters

## Next Steps

- Create frontend login/registration forms
- Connect frontend to these API endpoints
- Add role-based access control for protected routes
- Implement password reset functionality
