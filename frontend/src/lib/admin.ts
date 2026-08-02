import { AuthError, type AuthUser } from "@/lib/auth";

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AuthError(
      response.status,
      (detail && typeof detail.detail === "string" && detail.detail) || "La solicitud falló"
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchUsers(): Promise<AuthUser[]> {
  return adminRequest<AuthUser[]>("/api/admin/users");
}

export async function createUser(
  username: string,
  password: string,
  role: "admin" | "basico"
): Promise<AuthUser> {
  return adminRequest<AuthUser>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

export async function updateUserRole(
  userId: number,
  role: "admin" | "basico"
): Promise<AuthUser> {
  return adminRequest<AuthUser>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function resetUserPassword(userId: number, password: string): Promise<AuthUser> {
  return adminRequest<AuthUser>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}

export async function deleteUser(userId: number): Promise<void> {
  await adminRequest<void>(`/api/admin/users/${userId}`, { method: "DELETE" });
}
