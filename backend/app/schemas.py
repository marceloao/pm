from typing import Literal

from pydantic import BaseModel


class CardOut(BaseModel):
    id: str
    title: str
    details: str
    position: int


class ColumnOut(BaseModel):
    id: str
    title: str
    position: int
    cards: list[CardOut]


class BoardOut(BaseModel):
    columns: list[ColumnOut]


class CardCreate(BaseModel):
    column_id: str
    title: str
    details: str = ""


class CardUpdate(BaseModel):
    title: str | None = None
    details: str | None = None


class CardMove(BaseModel):
    column_id: str
    position: int


class ColumnRename(BaseModel):
    title: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class AiAction(BaseModel):
    type: Literal[
        "create_card", "update_card", "move_card", "delete_card", "rename_column"
    ]
    column_id: str | None = None
    card_id: str | None = None
    title: str | None = None
    details: str | None = None
    position: int | None = None


class AiChatOutput(BaseModel):
    reply: str
    actions: list[AiAction] = []


class ChatResponse(BaseModel):
    reply: str
    board: BoardOut
