// Detect the backend URL for images and API
// In dev, React runs on :3000 or :3002 and backend on :3001
// In prod, they are served together
const BACKEND_BASE = (() => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    // If dev (not port 3001 and not standard empty port), backend is on 3001
    if (process.env.NODE_ENV === 'development' || (port && port !== '3001' && port !== '80' && port !== '443')) {
      return `${protocol}//${hostname}:3001`;
    }
    return '';
  }
  return '';
})();

// API configuration
export const API_BASE_URL = `${BACKEND_BASE}/api`;

// Backup API URLs if main one fails
export const FALLBACK_API_URLS = [
  'http://localhost:3001/api',
  'http://127.0.0.1:3001/api'
];

// Image URL helper
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('blob:')) return path;
  // If already a full absolute URL (from backend), return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // In development, backend returns http://localhost:3001/uploads/...
    // This should work directly
    return path;
  }
  // Relative path like /uploads/filename -> prepend backend base
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_BASE}${cleanPath}`;
};
