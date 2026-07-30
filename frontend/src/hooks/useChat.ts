"use client";

import { useCallback, useState } from "react";
import * as api from "@/lib/api";
import type { ChatMessage } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

export function useChat(onBoardUpdate: (board: BoardData) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) {
        return;
      }

      const history = messages;
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setSending(true);
      setError(null);

      try {
        const { reply, board } = await api.sendChatMessage(trimmed, history);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        onBoardUpdate(board);
      } catch {
        setError("Could not reach the AI assistant.");
      } finally {
        setSending(false);
      }
    },
    [messages, sending, onBoardUpdate]
  );

  return { messages, sending, error, sendMessage };
}
