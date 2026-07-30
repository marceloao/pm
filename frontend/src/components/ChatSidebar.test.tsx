import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatSidebar } from "@/components/ChatSidebar";
import * as api from "@/lib/api";

vi.mock("@/lib/api");

const fixtureBoard = {
  columns: [{ id: "col-backlog", title: "Backlog", cardIds: [] }],
  cards: {},
};

describe("ChatSidebar", () => {
  it("sends a message and shows the AI reply", async () => {
    vi.mocked(api.sendChatMessage).mockResolvedValue({
      reply: "Done!",
      board: fixtureBoard,
    });
    const onBoardUpdate = vi.fn();

    render(<ChatSidebar onBoardUpdate={onBoardUpdate} />);

    await userEvent.type(screen.getByTestId("chat-input"), "Create a card");
    await userEvent.click(screen.getByTestId("chat-send"));

    expect(await screen.findByText("Done!")).toBeInTheDocument();
    expect(screen.getByText("Create a card")).toBeInTheDocument();
    expect(onBoardUpdate).toHaveBeenCalledWith(fixtureBoard);
  });

  it("shows an error when the request fails", async () => {
    vi.mocked(api.sendChatMessage).mockRejectedValue(new Error("network down"));

    render(<ChatSidebar onBoardUpdate={() => {}} />);

    await userEvent.type(screen.getByTestId("chat-input"), "Hello");
    await userEvent.click(screen.getByTestId("chat-send"));

    expect(await screen.findByTestId("chat-error")).toBeInTheDocument();
  });

  it("does not submit an empty message", async () => {
    vi.mocked(api.sendChatMessage).mockClear();
    render(<ChatSidebar onBoardUpdate={() => {}} />);

    expect(screen.getByTestId("chat-send")).toBeDisabled();
    expect(api.sendChatMessage).not.toHaveBeenCalled();
  });
});
