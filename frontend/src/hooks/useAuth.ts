"use client";

import { useEffect, useState } from "react";
import {
  AuthError,
  type AuthUser,
  changePassword as apiChangePassword,
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .finally(() => setCheckingSession(false));
  }, []);

  const login = async (username: string, password: string): Promise<string | null> => {
    try {
      setUser(await apiLogin(username, password));
      return null;
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        return "Usuario o contraseña incorrectos.";
      }
      return "No se pudo iniciar sesión.";
    }
  };

  const register = async (username: string, password: string): Promise<string | null> => {
    try {
      setUser(await apiRegister(username, password));
      return null;
    } catch (err) {
      if (err instanceof AuthError && err.status === 409) {
        return "Ese nombre de usuario ya existe.";
      }
      return "No se pudo crear la cuenta.";
    }
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<string | null> => {
    try {
      await apiChangePassword(currentPassword, newPassword);
      return null;
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        return "La contraseña actual es incorrecta.";
      }
      return "No se pudo cambiar la contraseña.";
    }
  };

  return {
    user,
    isAuthenticated: user !== null,
    checkingSession,
    login,
    register,
    logout,
    changePassword,
  };
}
