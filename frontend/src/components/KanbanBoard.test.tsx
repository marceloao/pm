import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import * as api from "@/lib/api";

vi.mock("@/lib/api");

const fixtureBoard = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1"] },
    { id: "col-discovery", title: "Discovery", cardIds: [] },
    { id: "col-progress", title: "In Progress", cardIds: [] },
    { id: "col-review", title: "Review", cardIds: [] },
    { id: "col-done", title: "Done", cardIds: [] },
  ],
  cards: {
    "card-1": { id: "card-1", title: "Align roadmap themes", details: "Draft themes." },
  },
};

const basicUser = { id: 1, username: "user", role: "basico" as const };

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

beforeEach(() => {
  vi.mocked(api.fetchBoards).mockResolvedValue([{ id: "board-1", name: "Mi tablero" }]);
  vi.mocked(api.fetchBoard).mockResolvedValue(structuredClone(fixtureBoard));
  vi.mocked(api.renameColumn).mockResolvedValue(undefined);
  vi.mocked(api.deleteCard).mockResolvedValue(undefined);
  vi.mocked(api.moveCard).mockResolvedValue(undefined);
});

describe("KanbanBoard", () => {
  it("renders five columns", async () => {
    render(
      <KanbanBoard user={basicUser} onLogout={() => {}} onChangePassword={async () => null} />
    );
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column", async () => {
    render(
      <KanbanBoard user={basicUser} onLogout={() => {}} onChangePassword={async () => null} />
    );
    await screen.findAllByTestId(/column-/i);

    const column = getFirstColumn();
    const input = within(column).getByLabelText("Título de columna");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");

    input.blur();
    expect(api.renameColumn).toHaveBeenCalledWith("col-backlog", "New Name");
  });

  it("adds and removes a card", async () => {
    vi.mocked(api.createCard).mockResolvedValue({
      id: "new-card",
      title: "New card",
      details: "Notes",
    });

    render(
      <KanbanBoard user={basicUser} onLogout={() => {}} onChangePassword={async () => null} />
    );
    await screen.findAllByTestId(/column-/i);

    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /agregar una tarjeta/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/título de la tarjeta/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/detalles/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /agregar tarjeta/i }));

    expect(await within(column).findByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /eliminar new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("shows an error state when the board fails to load", async () => {
    vi.mocked(api.fetchBoard).mockRejectedValue(new Error("network down"));

    render(
      <KanbanBoard user={basicUser} onLogout={() => {}} onChangePassword={async () => null} />
    );

    expect(await screen.findByTestId("board-error")).toBeInTheDocument();
    expect(screen.queryByTestId(/column-/i)).not.toBeInTheDocument();
  });

  it("shows the admin panel button only for admin users", async () => {
    render(
      <KanbanBoard user={basicUser} onLogout={() => {}} onChangePassword={async () => null} />
    );
    await screen.findAllByTestId(/column-/i);
    expect(screen.queryByTestId("open-admin-panel")).not.toBeInTheDocument();

    const adminUser = { id: 2, username: "admin", role: "admin" as const };
    render(
      <KanbanBoard user={adminUser} onLogout={() => {}} onChangePassword={async () => null} />
    );
    expect(await screen.findAllByTestId("open-admin-panel")).toHaveLength(1);
  });
});
