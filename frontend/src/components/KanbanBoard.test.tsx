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

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

beforeEach(() => {
  vi.mocked(api.fetchBoard).mockResolvedValue(structuredClone(fixtureBoard));
  vi.mocked(api.renameColumn).mockResolvedValue(undefined);
  vi.mocked(api.deleteCard).mockResolvedValue(undefined);
  vi.mocked(api.moveCard).mockResolvedValue(undefined);
});

describe("KanbanBoard", () => {
  it("renders five columns", async () => {
    render(<KanbanBoard onLogout={() => {}} />);
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column", async () => {
    render(<KanbanBoard onLogout={() => {}} />);
    await screen.findAllByTestId(/column-/i);

    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
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

    render(<KanbanBoard onLogout={() => {}} />);
    await screen.findAllByTestId(/column-/i);

    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(await within(column).findByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("shows an error state when the board fails to load", async () => {
    vi.mocked(api.fetchBoard).mockRejectedValue(new Error("network down"));

    render(<KanbanBoard onLogout={() => {}} />);

    expect(await screen.findByTestId("board-error")).toBeInTheDocument();
    expect(screen.queryByTestId(/column-/i)).not.toBeInTheDocument();
  });
});
