/**
 * Centralized API Base URL Configuration
 * Supports environment variable overrides with a safe automatic fallback.
 */

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Safe automatic fallback
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    // If running on a non-standard port or hostname, default to relative '/api'
    return `${window.location.origin}/api`;
  }

  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = API_BASE_URL;

export default API_BASE_URL;
