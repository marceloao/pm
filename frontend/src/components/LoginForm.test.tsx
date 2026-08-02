import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";

describe("LoginForm", () => {
  it("calls onLogin with the entered credentials and shows no error on success", async () => {
    const onLogin = vi.fn().mockResolvedValue(null);
    const onRegister = vi.fn();
    render(<LoginForm onLogin={onLogin} onRegister={onRegister} />);

    await userEvent.type(screen.getByTestId("login-username"), "user");
    await userEvent.type(screen.getByTestId("login-password"), "password");
    await userEvent.click(screen.getByTestId("login-submit"));

    expect(onLogin).toHaveBeenCalledWith("user", "password");
    expect(screen.queryByTestId("login-error")).not.toBeInTheDocument();
  });

  it("shows an error message when the credentials are rejected", async () => {
    const onLogin = vi.fn().mockResolvedValue("Invalid username or password");
    const onRegister = vi.fn();
    render(<LoginForm onLogin={onLogin} onRegister={onRegister} />);

    await userEvent.type(screen.getByTestId("login-username"), "user");
    await userEvent.type(screen.getByTestId("login-password"), "wrong");
    await userEvent.click(screen.getByTestId("login-submit"));

    expect(screen.getByTestId("login-error")).toHaveTextContent(
      "Invalid username or password"
    );
  });

  it("switches to register mode and calls onRegister on submit", async () => {
    const onLogin = vi.fn();
    const onRegister = vi.fn().mockResolvedValue(null);
    render(<LoginForm onLogin={onLogin} onRegister={onRegister} />);

    await userEvent.click(screen.getByTestId("toggle-auth-mode"));
    await userEvent.type(screen.getByTestId("login-username"), "alice");
    await userEvent.type(screen.getByTestId("login-password"), "secret123");
    await userEvent.click(screen.getByTestId("login-submit"));

    expect(onRegister).toHaveBeenCalledWith("alice", "secret123");
    expect(onLogin).not.toHaveBeenCalled();
  });
});
