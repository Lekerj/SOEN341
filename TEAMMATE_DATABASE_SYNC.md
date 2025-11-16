# Teammate Database Sync Instructions

**IMPORTANT:** Your teammate must run this script to match your local database exactly.

## Quick Start (Copy & Paste)

### Step 1: Run the Reset Script

Open your terminal and run this command:

```bash
mysql -u 341 -p"Pass341!" -h localhost convenevents < backend/sql/reset-database-complete.sql
```

**That's it!** Your database is now synced to match the main repository.

---

## What the Script Does

This script automatically:

1. ✅ **DROPS** all tables (in correct order to avoid foreign key errors)
2. ✅ **CREATES** all 11 tables fresh (in correct dependency order)
3. ✅ **INSERTS** default data:
   - Default organization (ConEvents)
   - Admin user (admin@conevents.com / admin123)
4. ✅ **VERIFIES** everything was created successfully

---

## Database Credentials

```
Host:     localhost
User:     341
Password: Pass341!
Database: convenevents
```

---

## Expected Output

After running the script, you should see:

```
✅ DATABASE RESET COMPLETE!

All tables have been created successfully:
+--------------------+-----------+---------+
| Table_Name         | Row_Count | Size_MB |
+--------------------+-----------+---------+
| answers            | 0         | 0.02    |
| events             | 0         | 0.02    |
| helpful_votes      | 0         | 0.02    |
| notifications      | 0         | 0.02    |
| organization_mem   | 1         | 0.02    |
| organizer_requests | 0         | 0.02    |
| organizations      | 1         | 0.02    |
| questions          | 0         | 0.02    |
| reviews            | 0         | 0.02    |
| tickets            | 0         | 0.02    |
| users              | 1         | 0.02    |
+--------------------+-----------+---------+

Sample Admin User Created:
Email: admin@conevents.com
Password: admin123
Role: admin

✅ Your database now matches the main repository exactly!
```

---

## What's New in This Version

### New Table: `helpful_votes`
- Tracks which users voted helpful on questions and answers
- Prevents duplicate votes (one per user per item)
- Persists votes across page refreshes

### Related Changes:
- Backend: `/api/questions/user-votes` endpoint added
- Frontend: Pre-disables helpful buttons for items user already voted on
- Error handling: 409 Conflict responses when user tries to vote twice

---

## Troubleshooting

### Error: "Access denied for user '341'@'localhost'"

**Solution:** Make sure MySQL is running and credentials are correct:
```bash
mysql -u 341 -p"Pass341!" -h localhost
```

If this fails, check with your team lead for the correct credentials.

### Error: "database 'convenevents' does not exist"

**Solution:** Create the database first:
```bash
mysql -u 341 -p"Pass341!" -h localhost -e "CREATE DATABASE IF NOT EXISTS convenevents;"
```

Then run the reset script again:
```bash
mysql -u 341 -p"Pass341!" -h localhost convenevents < backend/sql/reset-database-complete.sql
```

### Error: "Table 'X' already exists"

This shouldn't happen because the script uses `DROP TABLE IF EXISTS`. If it does:
1. Double-check the command (copy from above)
2. Make sure you're in the correct directory
3. Try running it again

### Everything looks good - how do I verify it worked?

Run this command to check all tables were created:

```bash
mysql -u 341 -p"Pass341!" -h localhost -e "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='convenevents' ORDER BY TABLE_NAME;"
```

You should see 11 tables:
- answers
- events
- helpful_votes ✅ **(NEW)**
- notifications
- organization_members
- organizer_requests
- organizations
- questions
- reviews
- tickets
- users

---

## File Locations

| File | Purpose |
|------|---------|
| `backend/sql/reset-database-complete.sql` | Main reset script (THE ONE TO RUN) |
| `backend/sql/setup-database.sql` | Master setup script (for fresh DB installation) |
| `backend/config/db.js` | Database configuration |

---

## After Running the Script

1. ✅ **Start the servers:**
   ```bash
   npm run start:local  # Backend
   npm exec http-server frontend -p 8080  # Frontend
   ```

2. ✅ **Test helpful votes feature:**
   - Navigate to Q&A page
   - Click helpful on a question
   - Refresh the page
   - Button should remain disabled

3. ✅ **Verify admin account:**
   - Email: admin@conevents.com
   - Password: admin123

---

## Questions?

If something doesn't work:
1. Check the error message carefully
2. Verify MySQL is running: `mysql -u 341 -p"Pass341!" -h localhost -e "SELECT 1;"`
3. Check database exists: `mysql -u 341 -p"Pass341!" -h localhost convenevents -e "SELECT 1;"`
4. Contact your team lead with the exact error message

---

**Last Updated:** November 16, 2025
**Author:** Your Team
**Status:** Ready for Deployment
