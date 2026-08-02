"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { BoardSummary } from "@/lib/api";

const ACTIVE_BOARD_STORAGE_KEY = "kanban-active-board";

export function useBoards() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .fetchBoards()
      .then((fetched) => {
        setBoards(fetched);
        const remembered = localStorage.getItem(ACTIVE_BOARD_STORAGE_KEY);
        const initial = fetched.find((board) => board.id === remembered) ?? fetched[0];
        setActiveBoardId(initial ? initial.id : null);
      })
      .catch(() => setError("No se pudieron cargar tus tableros."))
      .finally(() => setLoading(false));
  }, []);

  const switchBoard = useCallback((boardId: string) => {
    setActiveBoardId(boardId);
    localStorage.setItem(ACTIVE_BOARD_STORAGE_KEY, boardId);
  }, []);

  const addBoard = useCallback(async (name: string) => {
    const board = await api.createBoard(name);
    setBoards((prev) => [...prev, board]);
    switchBoard(board.id);
  }, [switchBoard]);

  const renameBoard = useCallback(async (boardId: string, name: string) => {
    const updated = await api.renameBoard(boardId, name);
    setBoards((prev) =>
      prev.map((board) => (board.id === boardId ? updated : board))
    );
  }, []);

  const removeBoard = useCallback(
    async (boardId: string) => {
      await api.deleteBoard(boardId);
      setBoards((prev) => {
        const remaining = prev.filter((board) => board.id !== boardId);
        if (activeBoardId === boardId) {
          const next = remaining[0] ?? null;
          setActiveBoardId(next ? next.id : null);
          if (next) {
            localStorage.setItem(ACTIVE_BOARD_STORAGE_KEY, next.id);
          } else {
            localStorage.removeItem(ACTIVE_BOARD_STORAGE_KEY);
          }
        }
        return remaining;
      });
    },
    [activeBoardId]
  );

  return {
    boards,
    activeBoardId,
    loading,
    error,
    switchBoard,
    addBoard,
    renameBoard,
    removeBoard,
  };
}
