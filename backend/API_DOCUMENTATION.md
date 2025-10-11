# Enhanced Events API Documentation

## Overview
The enhanced events API provides comprehensive search and filtering capabilities for your event management system. This API supports all the filtering requirements you mentioned.

## Base URL
```
http://localhost:3000/api/events
```

## Endpoints

### 1. Search and Filter Events
**GET** `/api/events`

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `search` | string | Search in event title, organizer name, or organization | `?search=concert` |
| `category` | string | Filter by event category | `?category=sports` |
| `organization` | string | Filter by organization name | `?organization=Music Club` |
| `location` | string | Filter by event location | `?location=Montreal` |
| `price_min` | number | Minimum price filter (like Amazon slider) | `?price_min=10.00` |
| `price_max` | number | Maximum price filter (like Amazon slider) | `?price_max=50.00` |
| `date_start` | date | Start date for date range filter | `?date_start=2025-10-15` |
| `date_end` | date | End date for date range filter | `?date_end=2025-12-31` |
| `time_start` | time | Start time filter | `?time_start=18:00` |
| `time_end` | time | End time filter | `?time_end=22:00` |
| `min_tickets_needed` | integer | Filter events with at least this many available tickets | `?min_tickets_needed=5` |
| `min_capacity` | integer | Filter events with minimum capacity | `?min_capacity=100` |

#### Example Requests

1. **Basic search**:
   ```bash
   GET /api/events?search=concert
   ```

2. **Price range filter (like Amazon)**:
   ```bash
   GET /api/events?price_min=10&price_max=50
   ```

3. **Date range filter**:
   ```bash
   GET /api/events?date_start=2025-10-15&date_end=2025-12-31
   ```

4. **Multiple tickets availability**:
   ```bash
   GET /api/events?min_tickets_needed=5
   ```

5. **Combined filters**:
   ```bash
   GET /api/events?search=music&category=social&price_max=30&min_tickets_needed=3
   ```

#### Response Format
```json
{
  "success": true,
  "count": 25,
  "events": [
    {
      "id": 1,
      "title": "Jazz Concert",
      "description": "Amazing jazz performance",
      "event_date": "2025-11-15",
      "event_time": "19:30:00",
      "location": "Downtown Concert Hall",
      "price": 25.00,
      "category": "social",
      "organization": "Music Club",
      "capacity": 200,
      "tickets_available": 150,
      "image_url": "https://example.com/image.jpg",
      "organizer_name": "john_doe"
    }
  ],
  "filters_applied": {
    "search": "jazz",
    "category": "social",
    "price_range": { "min": null, "max": 30 },
    "date_range": { "start": null, "end": null },
    "min_tickets_needed": 3
  }
}
```

### 2. Get Filter Options
**GET** `/api/events/filter-options`

Returns available options for dropdown filters.

#### Response
```json
{
  "success": true,
  "filter_options": {
    "categories": [
      {"category": "academic"},
      {"category": "social"},
      {"category": "sports"},
      {"category": "club"}
    ],
    "organizations": [
      {"organization": "Music Club"},
      {"organization": "Sports Club"}
    ],
    "locations": [
      {"location": "Downtown Concert Hall"},
      {"location": "University Campus"}
    ],
    "price_range": [
      {"min_price": 0, "max_price": 100}
    ]
  }
}
```

### 3. Get Event Details
**GET** `/api/events/:id`

Get detailed information about a specific event.

#### Response
```json
{
  "success": true,
  "event": {
    "id": 1,
    "title": "Jazz Concert",
    "description": "Amazing jazz performance",
    "event_date": "2025-11-15",
    "event_time": "19:30:00",
    "location": "Downtown Concert Hall",
    "price": 25.00,
    "category": "social",
    "organization": "Music Club",
    "capacity": 200,
    "tickets_available": 150,
    "organizer_name": "john_doe",
    "organizer_email": "john@example.com"
  }
}
```

### 4. Check Ticket Availability
**POST** `/api/events/check-availability`

Check if enough tickets are available for a group booking.

#### Request Body
```json
{
  "event_id": 1,
  "tickets_requested": 5
}
```

#### Response
```json
{
  "success": true,
  "event_id": 1,
  "event_title": "Jazz Concert",
  "tickets_requested": 5,
  "tickets_available": 150,
  "can_fulfill": true,
  "individual_price": 25.00,
  "total_cost": 125.00,
  "availability_status": "available"
}
```

## Key Features Implemented

### ✅ Search Functionality
- Search by event title
- Search by organizer name
- Search by organization name

### ✅ Advanced Filtering
- **Date filtering**: Exact date or date range
- **Time filtering**: Time range filtering  
- **Location filtering**: Partial text matching
- **Price filtering**: Range slider (min/max like Amazon)
- **Category filtering**: Dropdown selection
- **Organization filtering**: Text-based search
- **Capacity filtering**: Minimum capacity requirements
- **Ticket availability**: Filter by minimum available tickets

### ✅ Multi-Ticket Support
- Check availability for multiple tickets at once
- Filter events that have enough tickets for group bookings
- Calculate total costs for group purchases

### ✅ Input Validation
- Date format validation (YYYY-MM-DD)
- Time format validation (HH:MM)
- Price range validation
- Integer validation for tickets/capacity
- XSS protection through input sanitization

### ✅ Error Handling
- Comprehensive error messages
- HTTP status codes
- Input validation errors with details

## Database Schema Support
The implementation works with your existing `events` table structure and includes:
- JOIN with `users` table for organizer information
- Proper indexing for performance
- Support for all your table columns

## Frontend Integration
This API is designed to work seamlessly with your frontend browse page:
- Simple search bar → Use the `search` parameter
- Filter dropdowns → Use `/filter-options` endpoint to populate
- Price slider → Use `price_min` and `price_max` parameters
- Date picker → Use `date_start` and `date_end` parameters
- Ticket quantity selector → Use `min_tickets_needed` parameter