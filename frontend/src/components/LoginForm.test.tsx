import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";

describe("LoginForm", () => {
  it("calls onLogin with the entered credentials and shows no error on success", async () => {
    const onLogin = vi.fn().mockReturnValue(true);
    render(<LoginForm onLogin={onLogin} />);

    await userEvent.type(screen.getByTestId("login-username"), "user");
    await userEvent.type(screen.getByTestId("login-password"), "password");
    await userEvent.click(screen.getByTestId("login-submit"));

    expect(onLogin).toHaveBeenCalledWith("user", "password");
    expect(screen.queryByTestId("login-error")).not.toBeInTheDocument();
  });

  it("shows an error message when the credentials are rejected", async () => {
    const onLogin = vi.fn().mockReturnValue(false);
    render(<LoginForm onLogin={onLogin} />);

    await userEvent.type(screen.getByTestId("login-username"), "user");
    await userEvent.type(screen.getByTestId("login-password"), "wrong");
    await userEvent.click(screen.getByTestId("login-submit"));

    expect(screen.getByTestId("login-error")).toBeInTheDocument();
  });
});
