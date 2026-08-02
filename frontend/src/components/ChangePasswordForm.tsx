import { useState, type FormEvent } from "react";

type ChangePasswordFormProps = {
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<string | null>;
  onClose: () => void;
};

export const ChangePasswordForm = ({ onChangePassword, onClose }: ChangePasswordFormProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(false);
    const result = await onChangePassword(currentPassword, newPassword);
    setError(result);
    if (!result) {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed inset-0 flex items-center justify-center bg-black/30 p-6"
    >
      <div className="w-full max-w-sm space-y-4 rounded-[32px] border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
        <h2 className="font-display text-lg font-semibold text-[var(--navy-dark)]">
          Cambiar contraseña
        </h2>
        <input
          data-testid="current-password-input"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          type="password"
          placeholder="Contraseña actual"
          className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
        />
        <input
          data-testid="new-password-input"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          type="password"
          placeholder="Nueva contraseña"
          className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
        />
        {error ? (
          <p data-testid="change-password-error" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {success ? (
          <p data-testid="change-password-success" className="text-sm text-green-600">
            Contraseña actualizada correctamente.
          </p>
        ) : null}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]"
          >
            Cerrar
          </button>
          <button
            type="submit"
            data-testid="change-password-submit"
            className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
          >
            Guardar
          </button>
        </div>
      </div>
    </form>
  );
};
