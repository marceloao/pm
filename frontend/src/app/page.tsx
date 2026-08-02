"use client";

import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, checkingSession, login, register, logout, changePassword } = useAuth();

  if (checkingSession) {
    return null;
  }

  if (!user) {
    return <LoginForm onLogin={login} onRegister={register} />;
  }

  return <KanbanBoard user={user} onLogout={logout} onChangePassword={changePassword} />;
}
