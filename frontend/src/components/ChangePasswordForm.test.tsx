import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

describe("ChangePasswordForm", () => {
  it("submits current and new password and shows a success message", async () => {
    const onChangePassword = vi.fn().mockResolvedValue(null);
    render(<ChangePasswordForm onChangePassword={onChangePassword} onClose={() => {}} />);

    await userEvent.type(screen.getByTestId("current-password-input"), "oldpass");
    await userEvent.type(screen.getByTestId("new-password-input"), "newpass123");
    await userEvent.click(screen.getByTestId("change-password-submit"));

    expect(onChangePassword).toHaveBeenCalledWith("oldpass", "newpass123");
    expect(await screen.findByTestId("change-password-success")).toBeInTheDocument();
  });

  it("shows an error message when the current password is wrong", async () => {
    const onChangePassword = vi.fn().mockResolvedValue("La contraseña actual es incorrecta.");
    render(<ChangePasswordForm onChangePassword={onChangePassword} onClose={() => {}} />);

    await userEvent.type(screen.getByTestId("current-password-input"), "wrong");
    await userEvent.type(screen.getByTestId("new-password-input"), "newpass123");
    await userEvent.click(screen.getByTestId("change-password-submit"));

    expect(await screen.findByTestId("change-password-error")).toHaveTextContent(
      "La contraseña actual es incorrecta."
    );
  });

  it("calls onClose when closed", async () => {
    const onClose = vi.fn();
    render(<ChangePasswordForm onChangePassword={vi.fn()} onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
