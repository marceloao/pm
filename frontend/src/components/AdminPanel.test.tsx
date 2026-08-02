import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminPanel } from "@/components/AdminPanel";
import * as admin from "@/lib/admin";

vi.mock("@/lib/admin");

const users = [
  { id: 1, username: "user", role: "basico" as const },
  { id: 2, username: "admin", role: "admin" as const },
];

beforeEach(() => {
  vi.mocked(admin.fetchUsers).mockResolvedValue(structuredClone(users));
});

describe("AdminPanel", () => {
  it("lists existing users", async () => {
    render(<AdminPanel currentUserId={2} onClose={() => {}} />);

    expect(await screen.findByTestId("admin-user-row-user")).toBeInTheDocument();
    expect(screen.getByTestId("admin-user-row-admin")).toBeInTheDocument();
  });

  it("creates a new user", async () => {
    vi.mocked(admin.createUser).mockResolvedValue({
      id: 3,
      username: "carol",
      role: "basico",
    });

    render(<AdminPanel currentUserId={2} onClose={() => {}} />);
    await screen.findByTestId("admin-user-row-user");

    await userEvent.type(screen.getByTestId("admin-new-username"), "carol");
    await userEvent.type(screen.getByTestId("admin-new-password"), "secret123");
    await userEvent.click(screen.getByTestId("admin-create-submit"));

    expect(admin.createUser).toHaveBeenCalledWith("carol", "secret123", "basico");
  });

  it("prevents deleting the current user", async () => {
    render(<AdminPanel currentUserId={2} onClose={() => {}} />);
    await screen.findByTestId("admin-user-row-admin");

    expect(screen.getByTestId("admin-delete-admin")).toBeDisabled();
    expect(screen.getByTestId("admin-delete-user")).not.toBeDisabled();
  });

  it("calls onClose when returning to the board", async () => {
    const onClose = vi.fn();
    render(<AdminPanel currentUserId={2} onClose={onClose} />);
    await screen.findByTestId("admin-user-row-user");

    await userEvent.click(screen.getByTestId("close-admin-panel"));
    expect(onClose).toHaveBeenCalled();
  });
});
