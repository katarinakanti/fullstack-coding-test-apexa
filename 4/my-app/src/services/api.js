const API_BASE_URL = 'http://127.0.0.1:8001';

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

// Helper function to set auth token in localStorage
const setAuthToken = (token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
  }
};

// Helper function to remove auth token from localStorage
const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
  }
};

// Helper function for API calls with common error handling
const apiCall = async (url, options = {}) => {
  const token = getAuthToken();
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);
    
    // Handle different response types
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('API call error:', error);
    return { success: false, error: error.message };
  }
};

// Authentication API functions
export const authApi = {
  // Register a new user
  register: async (userData) => {
    const result = await apiCall('/api/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    // Register endpoint only returns success message, need to login after
    if (result.success) {
      // Automatically login after successful registration
      const loginResult = await authApi.login({
        username: userData.username,
        password: userData.password
      });
      return loginResult;
    }

    return result;
  },

  // Login user
  login: async (credentials) => {
    const result = await apiCall('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (result.success && result.data.access_token) {
      setAuthToken(result.data.access_token);
    }

    return result;
  },

  // Get current user info
  me: async () => {
    return await apiCall('/api/auth/me', {
      method: 'POST',
    });
  },

  // Logout user
  logout: () => {
    removeAuthToken();
    return Promise.resolve({ success: true });
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!getAuthToken();
  },
};

// Structure API functions
export const structureApi = {
  // Get all structures for the authenticated user
  getAll: async () => {
    return await apiCall('/api/structures', {
      method: 'GET',
    });
  },

  // Get a specific structure by ID
  getById: async (id) => {
    return await apiCall(`/api/structures/${id}`, {
      method: 'GET',
    });
  },

  // Create a new structure
  create: async (structureData) => {
    return await apiCall('/api/structures', {
      method: 'POST',
      body: JSON.stringify(structureData),
    });
  },

  // Update an existing structure
  update: async (id, structureData) => {
    return await apiCall(`/api/structures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(structureData),
    });
  },

  // Delete a structure
  delete: async (id) => {
    return await apiCall(`/api/structures/${id}`, {
      method: 'DELETE',
    });
  },
};

// Export utility functions
export { getAuthToken, setAuthToken, removeAuthToken };
