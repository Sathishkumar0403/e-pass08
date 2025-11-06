// Preferred base if provided; otherwise auto-detect at runtime
const ENV_API_BASE = (process.env.REACT_APP_API_BASE || "").trim();
let selectedApiBase = ENV_API_BASE || ""; // cached after first successful call

function buildCandidateBases() {
  if (ENV_API_BASE) return [ENV_API_BASE];
  const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
  const candidates = [];
  // Prefer common backend ports first to avoid proxy misroutes
  candidates.push(
    'http://localhost:3001/api',
    'http://localhost:3002/api',
    'http://127.0.0.1:3001/api',
    'http://127.0.0.1:3002/api'
  );
  if (origin) candidates.push(`${origin}/api`);
  return candidates;
}

// Helper function for API calls with timeout
import { API_BASE_URL, FALLBACK_API_URLS } from '../config';

export async function apiCall(endpoint, options = {}) {
  const API_URLS = [API_BASE_URL, ...FALLBACK_API_URLS].filter((url, index, self) => 
    self.indexOf(url) === index // Remove duplicates
  );
  
  let lastError = null;
  let attempts = 0;

  // Try each base URL in sequence
  for (const baseURL of API_URLS) {
    try {
      const url = `${baseURL}${endpoint}`;
      console.log('Attempting API call to:', url);

      const defaultOptions = {
        headers: {},
      };

      const mergedOptions = {
        ...defaultOptions,
        ...options,
      };

      // Don't set Content-Type for FormData
      if (!options.body || !(options.body instanceof FormData)) {
        mergedOptions.headers = {
          'Content-Type': 'application/json',
          ...mergedOptions.headers,
        };
      }

      attempts++;
      console.log(`Attempt ${attempts}/${API_URLS.length} - Trying ${url}`);
      
      // Log the request details
      console.log('Making API request to:', url, {
        method: mergedOptions.method,
        headers: mergedOptions.headers,
        bodyType: mergedOptions.body instanceof FormData ? 'FormData' : typeof mergedOptions.body
      });

      // Don't include credentials for now as we're not using sessions
      const response = await fetch(url, {
        ...mergedOptions,
        credentials: 'omit'
      });
      
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          console.error('Failed to parse response as JSON:', e);
          throw new Error('Invalid JSON response from server');
        }
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { message: text };
        }
      }

      if (!response.ok) {
        throw new Error(data.message || 'Server returned an error');
      }

      console.log('API call successful:', {
        endpoint,
        status: response.status,
        dataKeys: Object.keys(data)
      });

      return data;
    } catch (error) {
      console.error(`API call failed for ${baseURL}${endpoint}:`, error);
      lastError = error;
      continue; // Try next base URL
    }
  }

  // If we get here, all attempts failed
  throw new Error(lastError?.message || 'Failed to connect to any API endpoint');
}

// Student applies for bus pass
export async function applyStudent(form) {
  const formData = new FormData();
  
  // Log the form data for debugging
  console.log('Preparing form data:', Object.keys(form));

  for (const [key, value] of Object.entries(form)) {
    if (value !== undefined && value !== null) {
      // Properly handle file fields
      if (
        key === 'photo' ||
        key === 'aadharPhoto' ||
        key === 'collegeIdPhoto'
      ) {
        if (value) {
          console.log(`Adding file for ${key}:`, value.name);
          formData.append(key, value);
        }
      } else {
        console.log(`Adding field ${key}:`, value);
        formData.append(key, value);
      }
    }
  }

  try {
    const response = await apiCall('/student/apply', {
      method: 'POST',
      body: formData,
    });
    console.log('Application submission response:', response);
    return response;
  } catch (error) {
    console.error('Application submission failed:', error);
    throw new Error(
      error.message || 'Failed to submit application. Please try again.'
    );
  }
}

// Student login
export async function studentLogin(regNo, dob) {
  try {
    return await apiCall(`/student/login`, {
      method: "POST",
      body: JSON.stringify({ regNo, dob }),
    });
  } catch (error) {
    console.error('Error in student login:', error);
    throw new Error(error.message || 'Login failed');
  }
}

// Admin login
export async function adminLogin(username, password) {
  try {
    const response = await apiCall(`/admin/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return response;
  } catch (error) {
    console.error('Error in admin login:', error);
    throw new Error(error.message || 'Login failed');
  }
}

// Get all applications (admin)
export async function getApplications() {
  try {
    return await apiCall(`/admin/applications`);
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw new Error(error.message || 'Failed to fetch applications');
  }
}

// Approve application (admin)
export async function approveApplication(id) {
  try {
    return await apiCall(`/admin/approve/${id}`, {
      method: "POST",
    });
  } catch (error) {
    console.error('Error approving application:', error);
    throw new Error(error.message || 'Failed to approve application');
  }
}

// Reject application (admin)
export async function rejectApplication(id) {
  try {
    return await apiCall(`/admin/reject/${id}`, {
      method: "POST",
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    throw new Error(error.message || 'Failed to reject application');
  }
}

// Delete application (admin)
export async function deleteApplication(id) {
  try {
    return await apiCall(`/admin/delete/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error('Error deleting application:', error);
    throw new Error(error.message || 'Failed to delete application');
  }
}

// Upload fees bill (student)
export async function uploadFeesBill(regNo, file) {
  const formData = new FormData();
  formData.append('regNo', regNo);
  formData.append('feesBill', file);
  
  try {
    return await apiCall(`/student/upload-fees-bill`, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    console.error('Error uploading fees bill:', error);
    throw new Error(error.message || 'Failed to upload fees bill');
  }
}

// Request pass cancellation (student)
export async function requestPassCancellation(regNo, reason) {
  try {
    return await apiCall(`/student/request-cancellation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ regNo, reason }),
    });
  } catch (error) {
    console.error('Error requesting pass cancellation:', error);
    throw new Error(error.message || 'Failed to request pass cancellation');
  }
}

// Check cancellation status (student)
export async function checkCancellationStatus(regNo) {
  try {
    return await apiCall(`/student/cancellation-status/${encodeURIComponent(regNo)}`, {
      method: 'GET',
    });
  } catch (error) {
    console.error('Error checking cancellation status:', error);
    throw new Error(error.message || 'Failed to check cancellation status');
  }
}

// Get cancellation requests (admin)
export async function getCancellationRequests() {
  try {
    return await apiCall(`/admin/cancellation-requests`, {
      method: 'GET',
    });
  } catch (error) {
    console.error('Error fetching cancellation requests:', error);
    throw new Error(error.message || 'Failed to fetch cancellation requests');
  }
}

// Process cancellation request (admin)
export async function processCancellationRequest(id, action, adminUsername) {
  try {
    return await apiCall(`/admin/process-cancellation/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action, adminUsername }),
    });
  } catch (error) {
    console.error('Error processing cancellation request:', error);
    throw new Error(error.message || 'Failed to process cancellation request');
  }
}