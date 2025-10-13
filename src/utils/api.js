// Use relative API base; CRA dev server will proxy to backend
const API_BASE = "/api";

// Helper function for API calls with timeout
async function apiCall(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Prepare headers - don't set Content-Type for FormData
    const headers = {};
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }
    throw error;
  }
}

// Student applies for bus pass
export async function applyStudent(data) {
  try {
    // Validate required data
    if (!data.name || !data.dob || !data.regNo || !data.branchYear || !data.mobile || !data.parentMobile || !data.address || !data.route || !data.validity || !data.aadharNumber) {
      throw new Error('Please fill in all required fields');
    }
    
    if (!data.photo || !data.aadharPhoto || !data.collegeIdPhoto) {
      throw new Error('Please upload all required images');
    }
    
    // Create FormData for file uploads
    const formData = new FormData();
    
    // Add all text fields
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        if (key === 'photo' || key === 'aadharPhoto' || key === 'collegeIdPhoto') {
          // Add files
          if (data[key]) {
            formData.append(key, data[key]);
          }
        } else {
          // Add text fields
          formData.append(key, data[key]);
        }
      }
    });
    
    console.log('Sending FormData to server...');
    return await apiCall(`${API_BASE}/student/apply`, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error('Error applying for bus pass:', error);
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check if the backend is running.');
    }
    throw new Error(error.message || 'Failed to submit application');
  }
}

// Student login
export async function studentLogin(regNo, dob) {
  try {
    return await apiCall(`${API_BASE}/student/login`, {
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
    const response = await apiCall(`${API_BASE}/admin/login`, {
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
    return await apiCall(`${API_BASE}/admin/applications`);
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw new Error(error.message || 'Failed to fetch applications');
  }
}

// Approve application (admin)
export async function approveApplication(id) {
  try {
    return await apiCall(`${API_BASE}/admin/approve/${id}`, {
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
    return await apiCall(`${API_BASE}/admin/reject/${id}`, {
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
    return await apiCall(`${API_BASE}/admin/delete/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error('Error deleting application:', error);
    throw new Error(error.message || 'Failed to delete application');
  }
}
  