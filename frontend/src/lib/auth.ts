export type AuthUser = { id: number; username: string; role: "admin" | "basico" };

export class AuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
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

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me");
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<AuthUser>;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  return authRequest<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function register(username: string, password: string): Promise<AuthUser> {
  return authRequest<AuthUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  await authRequest<void>("/api/auth/logout", { method: "POST" });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await authRequest<void>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}
