import type { BoardData, Card, Column } from "@/lib/kanban";

export type BoardSummary = { id: string; name: string };

type ApiCard = { id: string; title: string; details: string; position: number };
type ApiColumn = { id: string; title: string; position: number; cards: ApiCard[] };
type ApiBoard = { id: string; name: string; columns: ApiColumn[] };

function toBoardData(board: ApiBoard): BoardData {
  const cards: Record<string, Card> = {};
  const columns: Column[] = board.columns.map((column) => {
    for (const card of column.cards) {
      cards[card.id] = { id: card.id, title: card.title, details: card.details };
    }
    return {
      id: column.id,
      title: column.title,
      cardIds: column.cards.map((card) => card.id),
    };
  });
  return { columns, cards };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchBoards(): Promise<BoardSummary[]> {
  return request<BoardSummary[]>("/api/boards");
}

export async function fetchBoard(boardId: string): Promise<BoardData> {
  return toBoardData(await request<ApiBoard>(`/api/boards/${boardId}`));
}

export async function createBoard(name: string): Promise<BoardSummary> {
  const board = await request<ApiBoard>("/api/boards", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return { id: board.id, name: board.name };
}

export async function renameBoard(boardId: string, name: string): Promise<BoardSummary> {
  return request<BoardSummary>(`/api/boards/${boardId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function deleteBoard(boardId: string): Promise<void> {
  await request<void>(`/api/boards/${boardId}`, { method: "DELETE" });
}

export async function createCard(
  columnId: string,
  title: string,
  details: string
): Promise<Card> {
  const card = await request<ApiCard>("/api/cards", {
    method: "POST",
    body: JSON.stringify({ column_id: columnId, title, details }),
  });
  return { id: card.id, title: card.title, details: card.details };
}

export async function deleteCard(cardId: string): Promise<void> {
  await request<void>(`/api/cards/${cardId}`, { method: "DELETE" });
}

export async function moveCard(
  cardId: string,
  columnId: string,
  position: number
): Promise<void> {
  await request<ApiCard>(`/api/cards/${cardId}/move`, {
    method: "POST",
    body: JSON.stringify({ column_id: columnId, position }),
  });
}

export async function renameColumn(columnId: string, title: string): Promise<void> {
  await request<ApiColumn>(`/api/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function sendChatMessage(
  boardId: string,
  message: string,
  history: ChatMessage[]
): Promise<{ reply: string; board: BoardData }> {
  const response = await request<{ reply: string; board: ApiBoard }>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ board_id: boardId, message, history }),
  });
  return { reply: response.reply, board: toBoardData(response.board) };
}
