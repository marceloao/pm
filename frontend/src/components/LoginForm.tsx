import { useState, type FormEvent } from "react";

type LoginFormProps = {
  onLogin: (username: string, password: string) => boolean;
};

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = onLogin(username, password);
    setError(!success);
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
            Sign in
          </h1>
        </div>
        <input
          data-testid="login-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
          className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
        />
        <input
          data-testid="login-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Password"
          className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
        />
        {error ? (
          <p data-testid="login-error" className="text-sm text-red-600">
            Invalid username or password.
          </p>
        ) : null}
        <button
          data-testid="login-submit"
          type="submit"
          className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
        >
          Sign in
        </button>
      </form>
    </div>
  );
};
