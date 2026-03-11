// Detect the backend URL for images and API
// In dev, React runs on :3000 or :3002 and backend on :3001
// In prod, they are served together
const BACKEND_BASE = (() => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    // Strictly stay on the same host if not localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3001`;
    }
// On production (e.g. Vercel), the backend is at the same origin
    return '';
  }
  return '';
})();

// API configuration
export const API_BASE_URL = `${BACKEND_BASE}/api`;

// Backup API URLs are ONLY for local development
const isLocal = typeof window !== 'undefined' && 
                (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const FALLBACK_API_URLS = []; 

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
