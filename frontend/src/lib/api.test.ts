import { fetchBoard } from "@/lib/api";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("fetchBoard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps the API board shape into the normalized BoardData shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          columns: [
            {
              id: "col-a",
              title: "A",
              position: 0,
              cards: [
                { id: "card-1", title: "One", details: "First", position: 0 },
                { id: "card-2", title: "Two", details: "Second", position: 1 },
              ],
            },
          ],
        })
      )
    );

    const board = await fetchBoard();

    expect(board.columns).toEqual([
      { id: "col-a", title: "A", cardIds: ["card-1", "card-2"] },
    ]);
    expect(board.cards["card-1"]).toEqual({
      id: "card-1",
      title: "One",
      details: "First",
    });
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 500)));

    await expect(fetchBoard()).rejects.toThrow();
  });
});
