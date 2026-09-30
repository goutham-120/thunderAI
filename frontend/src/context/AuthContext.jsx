import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('vajra_auth_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('vajra_auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Validate existing token with server on initial app load
  useEffect(() => {
    async function verifyExistingSession() {
      const savedToken = localStorage.getItem('vajra_auth_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (res?.user && res.user.status === 'APPROVED') {
          setUser(res.user);
          localStorage.setItem('vajra_auth_user', JSON.stringify(res.user));
        } else {
          // Inactive / non-approved status
          logout();
        }
      } catch (err) {
        console.warn('Session expired or invalid token:', err.message);
        logout();
      } finally {
        setIsLoading(false);
      }
    }
    verifyExistingSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password);
    if (res?.access_token && res?.user) {
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('vajra_auth_token', res.access_token);
      localStorage.setItem('vajra_auth_user', JSON.stringify(res.user));
    }
    return res;
  }, []);

  const register = useCallback(async (userData) => {
    return await api.register(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('vajra_auth_token');
      localStorage.removeItem('vajra_auth_user');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      if (res?.user) {
        setUser(res.user);
        localStorage.setItem('vajra_auth_user', JSON.stringify(res.user));
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!user && user.status === 'APPROVED',
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
