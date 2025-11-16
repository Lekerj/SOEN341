#!/bin/bash

# ============================================================================
# QUICK DATABASE SYNC SCRIPT FOR TEAMMATES
# ============================================================================
# This script automatically syncs your database with the main repository
#
# Usage:
#   chmod +x QUICK_DB_SYNC.sh
#   ./QUICK_DB_SYNC.sh
#
# Or just copy the command and run it in terminal:
#   mysql -u 341 -p"Pass341!" -h localhost convenevents < backend/sql/reset-database-complete.sql
#
# ============================================================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║     DATABASE SYNC - ConEvents Repository                   ║${NC}"
echo -e "${YELLOW}║     This will reset your database to match main repo      ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if database credentials are correct
echo -e "${YELLOW}Checking database connection...${NC}"
mysql -u 341 -p"Pass341!" -h localhost -e "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Database connection failed!${NC}"
    echo ""
    echo "Make sure:"
    echo "  1. MySQL server is running"
    echo "  2. Credentials are correct: user=341, password=Pass341!"
    echo "  3. Hostname is correct: localhost"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Check if database exists
echo -e "${YELLOW}Checking if 'convenevents' database exists...${NC}"
mysql -u 341 -p"Pass341!" -h localhost -e "USE convenevents;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Database 'convenevents' not found!${NC}"
    echo ""
    echo "Creating database..."
    mysql -u 341 -p"Pass341!" -h localhost -e "CREATE DATABASE IF NOT EXISTS convenevents;"
    echo -e "${GREEN}✓ Database created${NC}"
fi

echo ""
echo -e "${YELLOW}Running database reset script...${NC}"
echo "This will:"
echo "  1. DROP all existing tables"
echo "  2. CREATE fresh tables"
echo "  3. INSERT default data"
echo ""

# Run the reset script
mysql -u 341 -p"Pass341!" -h localhost convenevents < backend/sql/reset-database-complete.sql

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ DATABASE SYNC COMPLETE!                                 ║${NC}"
    echo -e "${GREEN}║  Your database now matches the main repository             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Sample Admin User:${NC}"
    echo "  Email:    admin@conevents.com"
    echo "  Password: admin123"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Start the backend: npm run start:local"
    echo "  2. Start the frontend: npm exec http-server frontend -p 8080"
    echo "  3. Navigate to: http://localhost:8080"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Database sync FAILED!${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check MySQL is running"
    echo "  2. Verify credentials in backend/config/db.js"
    echo "  3. Check backend/sql/reset-database-complete.sql file exists"
    echo ""
    exit 1
fi
