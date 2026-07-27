"use client";

import { useEffect, useState } from "react";
import { AUTH_STORAGE_KEY, validateCredentials } from "@/lib/auth";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem(AUTH_STORAGE_KEY) === "true");
  }, []);

  const login = (username: string, password: string): boolean => {
    if (!validateCredentials(username, password)) {
      return false;
    }
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  return { isAuthenticated, login, logout };
}
