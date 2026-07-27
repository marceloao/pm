"use client";

import { useCallback, useEffect, useState } from "react";
import { moveCard as reorderColumns, type BoardData } from "@/lib/kanban";
import * as api from "@/lib/api";

export function useBoard() {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .fetchBoard()
      .then(setBoard)
      .catch(() => setError("Could not load the board."))
      .finally(() => setLoading(false));
  }, []);

  const moveCard = useCallback((activeId: string, overId: string) => {
    setBoard((prev) => {
      if (!prev) {
        return prev;
      }

      const columns = reorderColumns(prev.columns, activeId, overId);
      const targetColumn = columns.find((column) => column.cardIds.includes(activeId));

      if (targetColumn) {
        const position = targetColumn.cardIds.indexOf(activeId);
        api
          .moveCard(activeId, targetColumn.id, position)
          .catch(() => setError("Could not save the card move."));
      }

      return { ...prev, columns };
    });
  }, []);

  const renameColumn = useCallback((columnId: string, title: string) => {
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            columns: prev.columns.map((column) =>
              column.id === columnId ? { ...column, title } : column
            ),
          }
        : prev
    );
  }, []);

  const commitRenameColumn = useCallback((columnId: string, title: string) => {
    api
      .renameColumn(columnId, title)
      .catch(() => setError("Could not save the column name."));
  }, []);

  const addCard = useCallback((columnId: string, title: string, details: string) => {
    api
      .createCard(columnId, title, details || "No details yet.")
      .then((card) => {
        setBoard((prev) =>
          prev
            ? {
                ...prev,
                cards: { ...prev.cards, [card.id]: card },
                columns: prev.columns.map((column) =>
                  column.id === columnId
                    ? { ...column, cardIds: [...column.cardIds, card.id] }
                    : column
                ),
              }
            : prev
        );
      })
      .catch(() => setError("Could not create the card."));
  }, []);

  const deleteCard = useCallback((columnId: string, cardId: string) => {
    api
      .deleteCard(cardId)
      .then(() => {
        setBoard((prev) =>
          prev
            ? {
                ...prev,
                cards: Object.fromEntries(
                  Object.entries(prev.cards).filter(([id]) => id !== cardId)
                ),
                columns: prev.columns.map((column) =>
                  column.id === columnId
                    ? {
                        ...column,
                        cardIds: column.cardIds.filter((id) => id !== cardId),
                      }
                    : column
                ),
              }
            : prev
        );
      })
      .catch(() => setError("Could not delete the card."));
  }, []);

  return {
    board,
    loading,
    error,
    moveCard,
    renameColumn,
    commitRenameColumn,
    addCard,
    deleteCard,
  };
}
