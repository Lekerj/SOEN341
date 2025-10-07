//export makes function available to other files
//this function takes on parameter which is the event
export function generateGoogleCalendarURL(event) {
    //base URL used by Google calendar to open pre-filled event creation form 
    const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  
    const formatDate = (date) => {
        // creates date object from string
        const d = new Date(date);
        //converts the date object into a standard format
        //replaces all dashes and colon symbol with " "
        //g for globally 
        //after the . it will split it nd add a Z for the timezone marker 
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
  
    const params = new URLSearchParams({
      text: event.title || '',
      dates: `${formatDate(event.start)}/${formatDate(event.end)}`,
      details: event.description || '',
      location: event.location || ''
    });
  
    return `${base}&${params.toString()}`;
  }
  