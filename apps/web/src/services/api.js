import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token & handle FormData
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const tenantId = localStorage.getItem('tenantId') || 'uwu-main';
  config.headers['X-Tenant-Id'] = tenantId;

  if (config.data instanceof FormData) {
    if (config.headers && typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
      config.headers.delete('content-type');
    } else if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }

  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    const errData = error.response?.data || error;
    // Ensure there is always a proper .message so callers can use err.message
    const normalized = typeof errData === 'object' && errData !== null
      ? errData
      : { message: String(errData) };
    if (!normalized.message) normalized.message = error.message || 'An unexpected error occurred';
    return Promise.reject(normalized);
  }
);

export default api;
