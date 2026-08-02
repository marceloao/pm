import { useState, type FormEvent } from "react";
import type { BoardSummary } from "@/lib/api";

type BoardSelectorProps = {
  boards: BoardSummary[];
  activeBoardId: string | null;
  onSwitch: (boardId: string) => void;
  onCreate: (name: string) => void | Promise<void>;
  onRename: (boardId: string, name: string) => void | Promise<void>;
  onDelete: (boardId: string) => void | Promise<void>;
};

export const BoardSelector = ({
  boards,
  activeBoardId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: BoardSelectorProps) => {
  const [creating, setCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? null;
  const [nameDraft, setNameDraft] = useState(activeBoard?.name ?? "");
  const [syncedBoardId, setSyncedBoardId] = useState(activeBoardId);

  if (activeBoardId !== syncedBoardId) {
    setSyncedBoardId(activeBoardId);
    setNameDraft(activeBoard?.name ?? "");
  }

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newBoardName.trim();
    if (!name) {
      return;
    }
    await onCreate(name);
    setNewBoardName("");
    setCreating(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        data-testid="board-select"
        value={activeBoardId ?? ""}
        onChange={(event) => onSwitch(event.target.value)}
        className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--navy-dark)] outline-none"
      >
        {boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name}
          </option>
        ))}
      </select>

      {activeBoard ? (
        <input
          id="board-name-input"
          data-testid="board-name-input"
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={() => {
            const trimmed = nameDraft.trim();
            if (trimmed && trimmed !== activeBoard.name) {
              onRename(activeBoard.id, trimmed);
            } else {
              setNameDraft(activeBoard.name);
            }
          }}
          className="w-40 rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
        />
      ) : null}

      {boards.length > 1 && activeBoard ? (
        <button
          type="button"
          data-testid="delete-board-button"
          onClick={() => onDelete(activeBoard.id)}
          className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-red-600"
        >
          Eliminar tablero
        </button>
      ) : null}

      {creating ? (
        <form onSubmit={handleCreateSubmit} className="flex items-center gap-2">
          <input
            data-testid="new-board-input"
            autoFocus
            value={newBoardName}
            onChange={(event) => setNewBoardName(event.target.value)}
            placeholder="Nombre del tablero"
            className="w-40 rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-medium text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
          />
          <button
            type="submit"
            data-testid="new-board-submit"
            className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
          >
            Crear
          </button>
        </form>
      ) : (
        <button
          type="button"
          data-testid="new-board-button"
          onClick={() => setCreating(true)}
          className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
        >
          + Nuevo tablero
        </button>
      )}
    </div>
  );
};
