import axios from 'axios';

// Use relative URL to leverage Vite's proxy in development
// In production, this should be set via environment variable
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance with interceptor for auth token
const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('merchant_token');
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('merchant_token');
        localStorage.removeItem('merchant_data');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
