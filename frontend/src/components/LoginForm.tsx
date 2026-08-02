import { useState, type FormEvent } from "react";

type LoginFormProps = {
  onLogin: (username: string, password: string) => Promise<string | null>;
  onRegister: (username: string, password: string) => Promise<string | null>;
};

export const LoginForm = ({ onLogin, onRegister }: LoginFormProps) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const action = isRegister ? onRegister : onLogin;
    const result = await action(username, password);
    setError(result);
    setSubmitting(false);
  };

  const toggleMode = () => {
    setMode(isRegister ? "login" : "register");
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
            Kanban Studio
          </p>
          <h1 className="mt-3 font-display text-2xl font-semibold text-[var(--navy-dark)]">
            {isRegister ? "Crear una cuenta" : "Iniciar sesión"}
          </h1>
        </div>
        <input
          data-testid="login-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Usuario"
          className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
        />
        <input
          data-testid="login-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Contraseña"
          className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
        />
        {error ? (
          <p data-testid="login-error" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <button
          data-testid="login-submit"
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </button>
        <button
          type="button"
          data-testid="toggle-auth-mode"
          onClick={toggleMode}
          className="w-full text-center text-xs font-semibold uppercase tracking-wide text-[var(--primary-blue)]"
        >
          {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿Nuevo aquí? Crea una cuenta"}
        </button>
      </form>
    </div>
  );
};
