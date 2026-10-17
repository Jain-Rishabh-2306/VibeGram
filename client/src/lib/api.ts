import axios from 'axios';
import { handleMockRequest } from './mockBackend';

const isGitHubPages =
  typeof window !== 'undefined' && window.location.hostname.includes('github.io');

const apiBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  timeout: 15000,
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

// Intercept request if running on GitHub Pages (static environment without Node backend)
api.interceptors.request.use(async (config) => {
  if (isGitHubPages) {
    // Return mock response directly via an adapter-like behavior
    const mockRes = await handleMockRequest(config);
    if (mockRes) {
      config.adapter = () => Promise.resolve(mockRes);
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Fallback to mock backend if request failed due to missing server / 404
    if (
      err.response?.status === 404 ||
      err.code === 'ERR_NETWORK' ||
      err.code === 'ECONNABORTED' ||
      !err.response
    ) {
      try {
        const mockRes = await handleMockRequest(original);
        if (mockRes) {
          return mockRes;
        }
      } catch {
        // fallback to normal error if mock fails
      }
    }

    if (err.response?.status === 401 && !original._retry && original.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(original))
          .catch((e) => Promise.reject(e));
      }
      original._retry = true;
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
