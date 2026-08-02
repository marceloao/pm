"use client";

import { useEffect, useState, type FormEvent } from "react";
import * as admin from "@/lib/admin";
import type { AuthUser } from "@/lib/auth";

type AdminPanelProps = {
  currentUserId: number;
  onClose: () => void;
};

export const AdminPanel = ({ currentUserId, onClose }: AdminPanelProps) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "basico">("basico");

  const [resetTargetId, setResetTargetId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const loadUsers = () => {
    setLoading(true);
    admin
      .fetchUsers()
      .then(setUsers)
      .catch(() => setError("No se pudieron cargar los usuarios."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    admin
      .fetchUsers()
      .then(setUsers)
      .catch(() => setError("No se pudieron cargar los usuarios."))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await admin.createUser(newUsername, newPassword, newRole);
      setNewUsername("");
      setNewPassword("");
      setNewRole("basico");
      loadUsers();
    } catch {
      setError("No se pudo crear el usuario. ¿El nombre de usuario ya existe?");
    }
  };

  const handleRoleChange = async (userId: number, role: "admin" | "basico") => {
    setError(null);
    try {
      await admin.updateUserRole(userId, role);
      loadUsers();
    } catch {
      setError("No se pudo cambiar el nivel del usuario.");
    }
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resetTargetId === null) return;
    setError(null);
    try {
      await admin.resetUserPassword(resetTargetId, resetPassword);
      setResetTargetId(null);
      setResetPassword("");
    } catch {
      setError("No se pudo restablecer la contraseña.");
    }
  };

  const handleDelete = async (userId: number) => {
    setError(null);
    try {
      await admin.deleteUser(userId);
      loadUsers();
    } catch {
      setError("No se pudo eliminar el usuario.");
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[1000px] flex-col gap-8 px-6 pb-16 pt-12">
      <header className="flex items-center justify-between gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
            Administración
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
            Gestión de usuarios
          </h1>
        </div>
        <button
          type="button"
          data-testid="close-admin-panel"
          onClick={onClose}
          className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
        >
          Volver al tablero
        </button>
      </header>

      {error ? (
        <p data-testid="admin-error" className="text-sm font-semibold text-red-600">
          {error}
        </p>
      ) : null}

      <section className="rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
        <h2 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
          Crear usuario
        </h2>
        <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-3">
          <input
            data-testid="admin-new-username"
            value={newUsername}
            onChange={(event) => setNewUsername(event.target.value)}
            placeholder="Usuario"
            className="rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
          />
          <input
            data-testid="admin-new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            type="password"
            placeholder="Contraseña"
            className="rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
          />
          <select
            data-testid="admin-new-role"
            value={newRole}
            onChange={(event) => setNewRole(event.target.value as "admin" | "basico")}
            className="rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none"
          >
            <option value="basico">Básico</option>
            <option value="admin">Administrador</option>
          </select>
          <button
            type="submit"
            data-testid="admin-create-submit"
            className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
          >
            Crear usuario
          </button>
        </form>
      </section>

      <section className="rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
        <h2 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
          Usuarios
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--gray-text)]">Cargando usuarios…</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                <th className="pb-2">Usuario</th>
                <th className="pb-2">Nivel</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} data-testid={`admin-user-row-${user.username}`} className="border-t border-[var(--stroke)]">
                  <td className="py-2 font-medium text-[var(--navy-dark)]">{user.username}</td>
                  <td className="py-2">
                    <select
                      data-testid={`admin-role-select-${user.username}`}
                      value={user.role}
                      onChange={(event) =>
                        handleRoleChange(user.id, event.target.value as "admin" | "basico")
                      }
                      className="rounded-lg border border-[var(--stroke)] bg-white px-2 py-1 text-xs text-[var(--navy-dark)] outline-none"
                    >
                      <option value="basico">Básico</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        data-testid={`admin-reset-password-${user.username}`}
                        onClick={() => {
                          setResetTargetId(user.id);
                          setResetPassword("");
                        }}
                        className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
                      >
                        Restablecer contraseña
                      </button>
                      <button
                        type="button"
                        data-testid={`admin-delete-${user.username}`}
                        disabled={user.id === currentUserId}
                        onClick={() => handleDelete(user.id)}
                        className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {resetTargetId !== null ? (
        <form
          onSubmit={handleResetSubmit}
          className="fixed inset-0 flex items-center justify-center bg-black/30 p-6"
        >
          <div className="w-full max-w-sm space-y-4 rounded-[32px] border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
            <h2 className="font-display text-lg font-semibold text-[var(--navy-dark)]">
              Restablecer contraseña
            </h2>
            <input
              data-testid="admin-reset-password-input"
              autoFocus
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              type="password"
              placeholder="Nueva contraseña"
              className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetTargetId(null)}
                className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="admin-reset-password-submit"
                className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
};
