export function generateGoogleCalendarURL(event) {
    const baseURL = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  
    // Format date to Google Calendar format: YYYYMMDDTHHMMSSZ
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
  