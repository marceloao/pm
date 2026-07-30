"use client";

import { useState, type FormEvent } from "react";
import { useChat } from "@/hooks/useChat";
import type { BoardData } from "@/lib/kanban";

type ChatSidebarProps = {
  onBoardUpdate: (board: BoardData) => void;
};

export const ChatSidebar = ({ onBoardUpdate }: ChatSidebarProps) => {
  const { messages, sending, error, sendMessage } = useChat(onBoardUpdate);
  const [input, setInput] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || sending) {
      return;
    }
    void sendMessage(input);
    setInput("");
  };

  return (
    <aside
      data-testid="chat-sidebar"
      className="flex h-[600px] w-full flex-col rounded-[32px] border border-[var(--stroke)] bg-white/80 p-6 shadow-[var(--shadow)] backdrop-blur lg:h-auto lg:max-h-[calc(100vh-6rem)] lg:w-[340px]"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
          AI Assistant
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold text-[var(--navy-dark)]">
          Ask about your board
        </h2>
      </div>

      <div
        data-testid="chat-messages"
        className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--gray-text)]">
            Ask me to create, edit, or move cards - I can update the board for you.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              data-testid={`chat-message-${message.role}`}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--primary-blue)] px-4 py-2 text-sm text-white"
                  : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--surface)] px-4 py-2 text-sm text-[var(--navy-dark)]"
              }
            >
              {message.content}
            </div>
          ))
        )}
        {sending ? (
          <div
            data-testid="chat-thinking"
            className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--surface)] px-4 py-2 text-sm text-[var(--gray-text)]"
          >
            Thinking…
          </div>
        ) : null}
      </div>

      {error ? (
        <p data-testid="chat-error" className="mt-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
        <input
          data-testid="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the AI assistant..."
          className="flex-1 rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
        />
        <button
          type="submit"
          data-testid="chat-send"
          disabled={sending || !input.trim()}
          className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </aside>
  );
};
