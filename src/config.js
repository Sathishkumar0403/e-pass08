// API configuration
const getBackendUrl = () => {
  const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // In development, always use port 3001 for backend
    return 'http://localhost:3001/api';
  }
  
  // In production, use the same origin
  return '/api';
};

export const API_BASE_URL = process.env.REACT_APP_API_URL || getBackendUrl();

// Backup API URLs if main one fails
export const FALLBACK_API_URLS = [
  'http://localhost:3001/api',
  'http://127.0.0.1:3001/api'
];

// Image URL helper
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  // Remove any double slashes in the path except after http(s):
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  return url.replace(/([^:]\/)\/+/g, "$1");
};
