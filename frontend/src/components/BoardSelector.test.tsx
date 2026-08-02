import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardSelector } from "@/components/BoardSelector";

const boards = [
  { id: "board-1", name: "Mi tablero" },
  { id: "board-2", name: "Second board" },
];

describe("BoardSelector", () => {
  it("switches boards from the select", async () => {
    const onSwitch = vi.fn();
    render(
      <BoardSelector
        boards={boards}
        activeBoardId="board-1"
        onSwitch={onSwitch}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await userEvent.selectOptions(screen.getByTestId("board-select"), "board-2");
    expect(onSwitch).toHaveBeenCalledWith("board-2");
  });

  it("creates a new board from the inline form", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <BoardSelector
        boards={boards}
        activeBoardId="board-1"
        onSwitch={vi.fn()}
        onCreate={onCreate}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await userEvent.click(screen.getByTestId("new-board-button"));
    await userEvent.type(screen.getByTestId("new-board-input"), "Marketing");
    await userEvent.click(screen.getByTestId("new-board-submit"));

    expect(onCreate).toHaveBeenCalledWith("Marketing");
  });

  it("renames the active board on blur", async () => {
    const onRename = vi.fn();
    render(
      <BoardSelector
        boards={boards}
        activeBoardId="board-1"
        onSwitch={vi.fn()}
        onCreate={vi.fn()}
        onRename={onRename}
        onDelete={vi.fn()}
      />
    );

    const input = screen.getByTestId("board-name-input");
    await userEvent.clear(input);
    await userEvent.type(input, "Renamed board");
    input.blur();

    expect(onRename).toHaveBeenCalledWith("board-1", "Renamed board");
  });

  it("only shows delete when there is more than one board", () => {
    const { rerender } = render(
      <BoardSelector
        boards={boards}
        activeBoardId="board-1"
        onSwitch={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByTestId("delete-board-button")).toBeInTheDocument();

    rerender(
      <BoardSelector
        boards={[boards[0]]}
        activeBoardId="board-1"
        onSwitch={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByTestId("delete-board-button")).not.toBeInTheDocument();
  });
});
