// Small helper to compute API base dynamically from current host
export function getApiBase() {
  const host = window.location.hostname;
  const port = 3000; // backend port
  return `http://${host}:${port}`;
}

export async function apiFetch(path, options = {}) {
  const base = getApiBase();
  const finalOptions = {
    credentials: "include",
    ...options,
  };
  
  const response = await fetch(`${base}${path}`, finalOptions);
  
  // Check for HTTP error status codes
  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorJson = JSON.parse(errorBody);
      if (errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch (e) {
      // If response is not JSON, use the text content or default message
      if (errorBody) {
        errorMessage = errorBody;
      }
    }

    const error = new Error(errorMessage);
    error.status = response.status; // Attach status code to error object
    throw error;
  }
  
  return response;
}
