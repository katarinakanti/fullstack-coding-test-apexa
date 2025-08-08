import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on app start
    const checkAuth = async () => {
      if (authApi.isAuthenticated()) {
        try {
          const result = await authApi.me();
          if (result.success) {
            setUser(result.data);
          } else {
            // Token might be expired or invalid
            authApi.logout();
            setUser(null);
          }
        } catch (error) {
          authApi.logout();
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const result = await authApi.login(credentials);
      if (result.success && result.data.user) {
        setUser(result.data.user);
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const result = await authApi.register(userData);
      if (result.success && result.data.user) {
        setUser(result.data.user);
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const isAuthenticated = () => {
    return !!user && authApi.isAuthenticated();
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
