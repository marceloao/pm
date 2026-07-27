"use client";

import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return <KanbanBoard onLogout={logout} />;
}
