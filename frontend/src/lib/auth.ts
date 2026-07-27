export const AUTH_STORAGE_KEY = "kanban-auth";

const VALID_USERNAME = "user";
const VALID_PASSWORD = "password";

export function validateCredentials(username: string, password: string): boolean {
  return username === VALID_USERNAME && password === VALID_PASSWORD;
}
