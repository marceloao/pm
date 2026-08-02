"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { ChatSidebar } from "@/components/ChatSidebar";
import { BoardSelector } from "@/components/BoardSelector";
import { AdminPanel } from "@/components/AdminPanel";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { useBoard } from "@/hooks/useBoard";
import { useBoards } from "@/hooks/useBoards";
import type { AuthUser } from "@/lib/auth";

type KanbanBoardProps = {
  user: AuthUser;
  onLogout: () => void | Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<string | null>;
};

export const KanbanBoard = ({ user, onLogout, onChangePassword }: KanbanBoardProps) => {
  const {
    boards,
    activeBoardId,
    loading: boardsLoading,
    error: boardsError,
    switchBoard,
    addBoard,
    renameBoard,
    removeBoard,
  } = useBoards();
  const {
    board,
    loading: boardLoading,
    error: boardError,
    setBoard,
    moveCard,
    renameColumn,
    commitRenameColumn,
    addCard,
    deleteCard,
  } = useBoard(activeBoardId);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "admin">("board");
  const [showChangePassword, setShowChangePassword] = useState(false);

  const loading = boardsLoading || (Boolean(activeBoardId) && boardLoading);
  const error = boardsError ?? boardError;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = useMemo(() => board?.cards ?? {}, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    moveCard(active.id as string, over.id as string);
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  if (view === "admin") {
    return <AdminPanel currentUserId={user.id} onClose={() => setView("board")} />;
  }

  if (loading) {
    return (
      <div
        data-testid="board-loading"
        className="flex min-h-screen items-center justify-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
      >
        Cargando tablero…
      </div>
    );
  }

  if (error || !board) {
    return (
      <div
        data-testid="board-error"
        className="flex min-h-screen items-center justify-center text-sm font-semibold text-red-600"
      >
        {error ?? "Ocurrió un error inesperado."}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Kanban Studio
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Mantén el ritmo a la vista. Cambia de tablero, renombra columnas, arrastra
                tarjetas entre etapas y anota lo importante sin perderte en configuraciones.
              </p>
            </div>
            <div className="flex items-start gap-4">
              {user.role === "admin" ? (
                <button
                  type="button"
                  data-testid="open-admin-panel"
                  onClick={() => setView("admin")}
                  className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
                >
                  Administración
                </button>
              ) : null}
              <button
                type="button"
                data-testid="open-change-password"
                onClick={() => setShowChangePassword(true)}
                className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
              >
                Cambiar contraseña
              </button>
              <button
                type="button"
                data-testid="logout-button"
                onClick={onLogout}
                className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
          <BoardSelector
            boards={boards}
            activeBoardId={activeBoardId}
            onSwitch={switchBoard}
            onCreate={addBoard}
            onRename={renameBoard}
            onDelete={removeBoard}
          />
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <section className="grid flex-1 gap-6 lg:grid-cols-5">
              {board.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={column.cardIds.map((cardId) => board.cards[cardId])}
                  onRename={renameColumn}
                  onRenameCommit={commitRenameColumn}
                  onAddCard={addCard}
                  onDeleteCard={deleteCard}
                />
              ))}
            </section>
            <DragOverlay>
              {activeCard ? (
                <div className="w-[260px]">
                  <KanbanCardPreview card={activeCard} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          <ChatSidebar boardId={activeBoardId} onBoardUpdate={setBoard} />
        </div>
      </main>

      {showChangePassword ? (
        <ChangePasswordForm
          onChangePassword={onChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      ) : null}
    </div>
  );
};
