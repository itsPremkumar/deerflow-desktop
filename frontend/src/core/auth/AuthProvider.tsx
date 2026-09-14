"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import { AUTH_DISABLED_USER } from "./auth-disabled-user";
import { type User } from "./types";

export type { User };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  applyUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialUser: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser ?? AUTH_DISABLED_USER);

  const applyUser = useCallback((next: User | null) => {
    setUser(next ?? AUTH_DISABLED_USER);
  }, []);

  const refreshUser = useCallback(async () => {
    // In chat-only direct mode, user is always the default local admin
    setUser(AUTH_DISABLED_USER);
  }, []);

  const logout = useCallback(async () => {
    // In chat-only direct mode, reload workspace
    if (typeof window !== "undefined") {
      window.location.href = "/workspace";
    }
  }, []);

  const value: AuthContextType = {
    user: user ?? AUTH_DISABLED_USER,
    isAuthenticated: true,
    isLoading: false,
    logout,
    refreshUser,
    applyUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return {
      user: AUTH_DISABLED_USER,
      isAuthenticated: true,
      isLoading: false,
      logout: async () => {},
      refreshUser: async () => {},
      applyUser: () => {},
    };
  }
  return context;
}

export function useRequireAuth(): AuthContextType {
  return useAuth();
}
