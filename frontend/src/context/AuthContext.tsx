import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isGuest: boolean;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('roast_guest_mode') === 'true';
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!localStorage.getItem('roast_token')) return;
        const check = await api.getCurrentUser();

        if (check.status === 'valid') {
          setUser(check.user);
          localStorage.setItem('roast_user', JSON.stringify(check.user));
          return;
        }

        if (check.status === 'rejected') {
          // The server will not accept this token. Showing the name from
          // localStorage anyway left people "signed in" while every request
          // they made was refused.
          localStorage.removeItem('roast_token');
          localStorage.removeItem('roast_user');
          setUser(null);
          return;
        }

        // Unreachable: the session may well still be valid, so keep showing it
        // rather than signing someone out because the backend blinked.
        const stored = localStorage.getItem('roast_user');
        if (stored) setUser(JSON.parse(stored));
      } catch (err) {
        console.error('Auth initialization error', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { access_token, user: loggedUser } = await api.login(email, password);
      localStorage.setItem('roast_token', access_token);
      localStorage.setItem('roast_user', JSON.stringify(loggedUser));
      localStorage.removeItem('roast_guest_mode');
      setIsGuest(false);
      setUser(loggedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { access_token, user: newUser } = await api.register(name, email, password);
      localStorage.setItem('roast_token', access_token);
      localStorage.setItem('roast_user', JSON.stringify(newUser));
      localStorage.removeItem('roast_guest_mode');
      setIsGuest(false);
      setUser(newUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('roast_token');
    localStorage.removeItem('roast_user');
    localStorage.removeItem('roast_guest_mode');
    setUser(null);
    setIsGuest(false);
  };

  const continueAsGuest = () => {
    localStorage.setItem('roast_guest_mode', 'true');
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        isGuest,
        continueAsGuest,
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
