import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types';
import { getApiBaseUrl } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; devResetToken?: string }>;
  resetPassword: (token: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message: string }>;
  setTokenManually: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from storage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('shield_auth_token') || sessionStorage.getItem('shield_auth_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
          } else {
            // Invalid / expired token
            localStorage.removeItem('shield_auth_token');
            sessionStorage.removeItem('shield_auth_token');
            setToken(null);
            setUser(null);
          }
        } catch {
          // Server offline or network issue: if token exists, fallback to cached user or local demo user
          const cachedUser = localStorage.getItem('shield_cached_user');
          if (cachedUser) {
            try {
              setUser(JSON.parse(cachedUser));
            } catch {
              setUser(null);
            }
          }
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe = false): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.detail || 'Authentication failed. Please verify credentials.' };
      }

      setToken(data.access_token);
      setUser(data.user);

      if (rememberMe) {
        localStorage.setItem('shield_auth_token', data.access_token);
        localStorage.setItem('shield_cached_user', JSON.stringify(data.user));
      } else {
        sessionStorage.setItem('shield_auth_token', data.access_token);
        sessionStorage.setItem('shield_cached_user', JSON.stringify(data.user));
      }

      // Also notify Chrome Extension if installed
      if (typeof window !== 'undefined') {
        window.postMessage({
          type: 'SHIELD_SET_AUTH_TOKEN',
          token: data.access_token,
          user: data.user,
        }, '*');

        if ((window as any).chrome?.runtime?.sendMessage) {
          try {
            (window as any).chrome.runtime.sendMessage({
              type: 'SET_AUTH_TOKEN',
              token: data.access_token,
              user: data.user,
            });
          } catch {
            // Extension might not be present or listening
          }
        }
      }

      setIsLoading(false);
      return { success: true };
    } catch {
      setIsLoading(false);
      return { success: false, error: 'Could not connect to Shield-Agent authentication service.' };
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsLoading(false);
        const errorMsg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        return { success: false, error: errorMsg || 'Registration failed.' };
      }

      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('shield_auth_token', data.access_token);
      localStorage.setItem('shield_cached_user', JSON.stringify(data.user));

      setIsLoading(false);
      return { success: true };
    } catch {
      setIsLoading(false);
      return { success: false, error: 'Could not connect to Shield-Agent backend.' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${getApiBaseUrl()}/api/auth/logout`, { method: 'POST' });
    } catch {
      // Continue client cleanup
    }
    localStorage.removeItem('shield_auth_token');
    localStorage.removeItem('shield_cached_user');
    sessionStorage.removeItem('shield_auth_token');
    sessionStorage.removeItem('shield_cached_user');
    setToken(null);
    setUser(null);

    // Notify extension
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'SHIELD_LOGOUT' }, '*');
      if ((window as any).chrome?.runtime?.sendMessage) {
        try {
          (window as any).chrome.runtime.sendMessage({ type: 'LOGOUT' });
        } catch {
          // Ignore
        }
      }
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return {
        success: true,
        message: data.message,
        devResetToken: data.dev_reset_token,
      };
    } catch {
      return {
        success: false,
        message: 'Could not submit password reset request.',
      };
    }
  };

  const resetPassword = async (token: string, newPassword: string, confirmPassword: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        return { success: false, message: errorMsg || 'Reset failed.' };
      }
      return { success: true, message: data.message };
    } catch {
      return { success: false, message: 'Could not connect to reset service.' };
    }
  };

  const setTokenManually = (manualToken: string, manualUser: User) => {
    setToken(manualToken);
    setUser(manualUser);
    localStorage.setItem('shield_auth_token', manualToken);
    localStorage.setItem('shield_cached_user', JSON.stringify(manualUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        setTokenManually,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
