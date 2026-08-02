"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { ChatMessage } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

export function useChat(boardId: string | null, onBoardUpdate: (board: BoardData) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [boardId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending || !boardId) {
        return;
      }

      const history = messages;
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setSending(true);
      setError(null);

      try {
        const { reply, board } = await api.sendChatMessage(boardId, trimmed, history);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        onBoardUpdate(board);
      } catch {
        setError("No se pudo contactar al asistente de IA.");
      } finally {
        setSending(false);
      }
    },
    [boardId, messages, sending, onBoardUpdate]
  );

  return { messages, sending, error, sendMessage };
}
