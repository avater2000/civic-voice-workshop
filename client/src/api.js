const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) {
    const error = typeof body.error === "object" ? body.error : { message: body.error };
    throw new ApiError(error.message ?? "Something went wrong.", response.status, error.code);
  }
  return body;
}

export function login(credentials) {
  return api("/api/login", { method: "POST", body: JSON.stringify(credentials) });
}
export function getHealthStatus() {
  return api("/api/health").then((health) => health.ok === true);
}
export function submitFeedback(feedback) {
  return api("/api/feedback", { method: "POST", body: JSON.stringify(feedback) });
}
export function getFeedback(user, filters = {}) {
  const parameters = new URLSearchParams();
  if (filters.category) parameters.set("category", filters.category);
  if (filters.status) parameters.set("status", filters.status);
  const query = parameters.size ? `?${parameters}` : "";
  return api(`/api/feedback${query}`, { headers: { "x-user-role": user.role } });
}
