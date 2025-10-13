// Import the function you just made
import { generateGoogleCalendarURL } from './utils/calendar.js';

// Create a mock event object
const event = {
  title: "AI Workshop",
  start: "2025-10-15T18:00:00Z",
  end: "2025-10-15T20:00:00Z",
  description: "Hands-on AI session with the CS Club!",
  location: "Hall A, Concordia University"
};

// Generate the Google Calendar URL
const url = generateGoogleCalendarURL(event);

// Print the URL so we can check it
console.log("✅ Google Calendar URL generated:");
console.log(url);
