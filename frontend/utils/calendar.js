/**
 * Generates a Google Calendar event URL.
 * @param {Object} event - Event details.
 * @param {string} event.title - Title of the event.
 * @param {Date|string} event.start - Start date/time.
 * @param {Date|string} event.end - End date/time.
 * @param {string} [event.description] - Description.
 * @param {string} [event.location] - Location.
 * @returns {string} A formatted Google Calendar URL.
 */
export function generateGoogleCalendarURL(event) {
    const baseURL = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  
    const formatDate = (date) => {
      const d = new Date(date);
      return d.toISOString().replace(/[-:]|\.\d{3}/g, "");
    };
  
    const { title, start, end, description = "", location = "" } = event;
  
    const params = new URLSearchParams({
      text: title,
      dates: `${formatDate(start)}/${formatDate(end)}`,
      details: description,
      location: location
    });
  
    return `${baseURL}&${params.toString()}`;
  }
  