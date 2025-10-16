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
  return fetch(`${base}${path}`, finalOptions);
}
