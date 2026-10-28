import axios from 'axios';

// API client for the StockFlow REST API, built on axios.
// Other files only use `http.get/post/put/patch/delete`, so they do not need to change.
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

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // fail instead of hanging forever if the server is unreachable
  headers: { 'Content-Type': 'application/json' },
});

// Request: attach the login token (skipped for the login call itself)
client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token && !config.skipAuth) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: return just the data, and turn every failure into one readable ApiError
client.interceptors.response.use(
  (response) => (response.data === '' ? null : response.data),
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      // An expired/invalid token on a normal request means the session is over
      if (status === 401 && !error.config?.skipAuth && tokenStore.get()) {
        tokenStore.clear();
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
      return Promise.reject(new ApiError(data?.message || `Request failed (${status})`, status));
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError('The server took too long to respond. Please try again.', 0));
    }
    return Promise.reject(new ApiError('Cannot reach the server. Check your connection and that the API is running.', 0));
  }
);

export const http = {
  get: (path) => client.get(path),
  post: (path, body, options = {}) => client.post(path, body ?? {}, { skipAuth: options.auth === false }),
  put: (path, body) => client.put(path, body ?? {}),
  patch: (path, body) => client.patch(path, body ?? {}),
  delete: (path) => client.delete(path),
};