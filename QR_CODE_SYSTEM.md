# QR Code Ticket System Documentation

## Overview

The ConEvents platform now includes a complete QR code-based ticket verification system that allows:

- Generation of scannable QR codes for each ticket
- Mobile scanning that opens a verification page
- Ticket check-in tracking to prevent double-scanning
- Visual status indicators for ticket validity

## System Architecture

### Backend Components

#### 1. QR Code Generation (`/api/tickets/qr/:ticketCode`)

- **Method**: GET
- **Purpose**: Generates a QR code image for a specific ticket
- **Returns**: Data URL containing the QR code image
- **QR Code Content**: Links to `http://localhost:8080/verify-ticket.html?code=TICKET_CODE`
- **Styling**: Uses Concordia maroon (#912338) for the QR pattern

#### 2. Ticket Verification (`/api/tickets/verify`)

- **Method**: POST
- **Purpose**: Validates a ticket and retrieves its details
- **Parameters**: `{ ticket_code: string }`
- **Returns**: Full ticket information including:
  - Event details (title, date, time, location)
  - Attendee information (name, email)
  - Check-in status
  - Ticket type (free/paid)

#### 3. Ticket Check-In (`/api/tickets/check-in`)

- **Method**: POST
- **Purpose**: Marks a ticket as checked-in (used)
- **Parameters**: `{ ticket_code: string }`
- **Validation**:
  - Verifies ticket exists
  - Prevents double check-in (returns 409 if already checked in)
- **Returns**: Success confirmation

### Frontend Components

#### 1. My Tickets Page Enhancement

- **New Button**: "📱 Show QR Code" added to each ticket card
- **QR Display**: Collapsible QR code image (250px width)
- **Lazy Loading**: QR codes are only generated when user clicks the button
- **Caching**: Once loaded, QR codes are cached in the DOM

#### 2. Verification Page (`verify-ticket.html`)

- **URL Pattern**: `/verify-ticket.html?code=TICKET_CODE`
- **Features**:
  - Real-time ticket verification
  - Visual status badges:
    - ✓ Valid Ticket (green)
    - ⚠️ Already Checked In (yellow)
    - ❌ Invalid Ticket (red)
  - Detailed ticket information display
  - One-click check-in button
  - Check-in confirmation with visual feedback

### Database Schema

#### Tickets Table

```sql
- id: INT (Primary Key, Auto Increment)
- user_id: INT (Foreign Key to users)
- event_id: INT (Foreign Key to events)
- ticket_type: ENUM('free', 'paid')
- qr_code: VARCHAR(255) - Unique ticket code
- checked_in: BOOLEAN DEFAULT FALSE - Check-in status
- created_at: TIMESTAMP
```

## User Flow

### 1. Claiming a Ticket

1. User logs in and browses events
2. Clicks "Reserve Spot" or "Get Tickets"
3. Confirms name/email in modal
4. Backend generates unique ticket code
5. Ticket is saved to database

### 2. Viewing QR Code

1. User navigates to "My Tickets" page
2. Clicks "📱 Show QR Code" button
3. System fetches QR code from backend
4. QR code displays with verification URL embedded
5. User can scan with phone camera

### 3. Scanning & Verification

1. User scans QR code with phone camera
2. Phone opens verification URL in browser
3. Verification page loads and validates ticket
4. Page displays:
   - Event information
   - Attendee details
   - Current status (valid/checked-in)
   - Check-in button (if not already checked in)

### 4. Check-In Process

1. Organizer/staff opens verification page
2. Reviews ticket details
3. Clicks "✓ Check In" button
4. System marks ticket as checked_in = TRUE
5. Success message displays
6. Status badge updates to "Already Checked In"
7. Future scans show ticket as already used

## Security Features

### 1. Authentication

- All ticket endpoints require user authentication
- Session-based auth with credentials: 'include'

### 2. Ticket Validation

- QR codes contain unique UUID codes
- Database lookup ensures ticket exists
- Only valid tickets can generate QR codes

### 3. Double-Scanning Prevention

- `checked_in` boolean flag in database
- Check-in endpoint returns 409 error if ticket already used
- Visual indicators prevent confusion

### 4. User Verification

- Verification page shows attendee name/email
- Allows staff to verify identity matches ticket holder

## Testing the System

### Test Scenario 1: Generate QR Code

1. Login as a user (e.g., testuser@test.com / password123)
2. Claim a ticket for any event
3. Go to My Tickets page
4. Click "📱 Show QR Code"
5. Verify QR code appears

### Test Scenario 2: Scan QR Code

1. Open QR code on desktop
2. Use phone camera to scan QR code
3. Phone should open verify-ticket.html page
4. Verify all ticket details display correctly
5. Check status badge shows "✓ Valid Ticket"

### Test Scenario 3: Check-In

1. On verification page, click "✓ Check In"
2. Verify success message appears
3. Verify status changes to "⚠️ Already Checked In"
4. Verify check-in button disappears

### Test Scenario 4: Prevent Double Check-In

1. Scan same ticket again
2. Verification page should show "Already Checked In"
3. Check-in button should not appear
4. Status badge should be yellow/warning

### Test Scenario 5: Invalid Ticket

1. Manually navigate to verify-ticket.html?code=invalid-code
2. Verify error message displays
3. Verify "❌ Invalid Ticket" badge appears

## API Endpoints Summary

| Endpoint                      | Method | Auth Required | Purpose                       |
| ----------------------------- | ------ | ------------- | ----------------------------- |
| `/api/tickets/claim`          | POST   | Yes           | Claim a ticket for an event   |
| `/api/tickets/qr/:ticketCode` | GET    | No            | Generate QR code image        |
| `/api/tickets/verify`         | POST   | Yes           | Verify ticket and get details |
| `/api/tickets/check-in`       | POST   | Yes           | Mark ticket as checked in     |

## Dependencies Added

```json
{
  "qrcode": "^1.5.x"
}
```

## Future Enhancements

### Potential Improvements:

1. **Email QR Codes**: Send QR code in confirmation email
2. **PDF Tickets**: Generate downloadable PDF with QR code
3. **Check-In Analytics**: Track check-in rates and timing
4. **Offline Mode**: Cache verification data for offline check-in
5. **Role-Based Access**: Separate organizer check-in interface
6. **Bulk Check-In**: Scan multiple tickets rapidly
7. **QR Code Expiry**: Time-limited QR codes for security
8. **Transfer Tickets**: Allow users to transfer tickets with new QR codes

## Technical Notes

### QR Code Format

- Uses Data URL format (base64 encoded PNG)
- 300x300 pixels
- Concordia maroon (#912338) pattern
- White background
- 2-pixel margin

### Performance

- QR codes generated on-demand (not stored in DB)
- Client-side caching prevents repeated generation
- Lightweight images (~2-3KB per QR code)

### Browser Compatibility

- Modern browsers with camera API support
- Works on iOS Safari, Chrome, Firefox
- Requires HTTPS in production for camera access

## Troubleshooting

### QR Code Not Displaying

- Check browser console for errors
- Verify backend server is running on port 3000
- Check network tab for failed API calls

### Verification Page Not Loading

- Ensure frontend server running on port 8080
- Check ticket code in URL is valid
- Verify user is logged in

### Check-In Not Working

- Verify user authentication
- Check ticket hasn't already been checked in
- Review backend console for errors

## Production Deployment Notes

For production deployment:

1. Update QR code URL from localhost to production domain
2. Enable HTTPS for camera scanning
3. Add rate limiting to prevent QR generation abuse
4. Implement proper error logging
5. Add analytics for scan/check-in tracking
6. Consider CDN for QR code delivery
7. Add backup verification method (manual code entry)
