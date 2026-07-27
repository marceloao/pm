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
