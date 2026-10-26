// Small fetch wrapper for the StockFlow REST API: adds the login token, parses JSON, and raises readable errors.
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const TOKEN_KEY = 'stockflow_token';

export const UNAUTHORIZED_EVENT = 'stockflow:unauthorized';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
  },
};

async function request(method, path, body, { auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and that the API is running.', 0);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }

  if (!res.ok) {
    // An expired/invalid token on a normal request means the session is over; the login endpoint is excluded.
    if (res.status === 401 && auth && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status);
  }
  return data;
}

export const http = {
  get: (path) => request('GET', path),
  post: (path, body, options) => request('POST', path, body ?? {}, options),
  put: (path, body) => request('PUT', path, body ?? {}),
  patch: (path, body) => request('PATCH', path, body ?? {}),
  delete: (path) => request('DELETE', path),
};
