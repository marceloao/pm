import os

from app.database import SEED_BOARD_ID


def test_creates_and_seeds_the_database_from_scratch(client):
    db_path = os.environ["DATABASE_PATH"]
    assert os.path.exists(db_path)

    response = client.get(f"/api/boards/{SEED_BOARD_ID}")
    assert response.status_code == 200

    board = response.json()
    assert len(board["columns"]) == 5
    assert sum(len(column["cards"]) for column in board["columns"]) == 8


def test_get_board_orders_columns_and_cards_by_position(client):
    board = client.get(f"/api/boards/{SEED_BOARD_ID}").json()

    assert [column["id"] for column in board["columns"]] == [
        "col-backlog",
        "col-discovery",
        "col-progress",
        "col-review",
        "col-done",
    ]
    backlog = board["columns"][0]
    assert [card["id"] for card in backlog["cards"]] == ["card-1", "card-2"]


def test_create_card_appends_to_the_end_of_the_column(client):
    response = client.post(
        "/api/cards",
        json={"column_id": "col-review", "title": "New card", "details": "Some details"},
    )
    assert response.status_code == 201
    created = response.json()
    assert created["title"] == "New card"
    assert created["position"] == 1

    board = client.get(f"/api/boards/{SEED_BOARD_ID}").json()
    review = next(c for c in board["columns"] if c["id"] == "col-review")
    assert [card["id"] for card in review["cards"]] == ["card-6", created["id"]]


def test_create_card_on_missing_column_returns_404(client):
    response = client.post(
        "/api/cards", json={"column_id": "missing", "title": "x", "details": ""}
    )
    assert response.status_code == 404


def test_update_card_changes_title_and_details(client):
    response = client.patch("/api/cards/card-1", json={"title": "Updated title"})
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == "Updated title"
    assert updated["details"] == "Draft quarterly themes with impact statements and metrics."


def test_update_missing_card_returns_404(client):
    response = client.patch("/api/cards/missing", json={"title": "x"})
    assert response.status_code == 404


def test_delete_card_removes_it_from_the_board(client):
    response = client.delete("/api/cards/card-1")
    assert response.status_code == 204

    board = client.get(f"/api/boards/{SEED_BOARD_ID}").json()
    backlog = next(c for c in board["columns"] if c["id"] == "col-backlog")
    assert [card["id"] for card in backlog["cards"]] == ["card-2"]


def test_delete_missing_card_returns_404(client):
    response = client.delete("/api/cards/missing")
    assert response.status_code == 404


def test_move_card_within_the_same_column_reorders_it(client):
    response = client.post(
        "/api/cards/card-4/move", json={"column_id": "col-progress", "position": 1}
    )
    assert response.status_code == 200

    board = client.get(f"/api/boards/{SEED_BOARD_ID}").json()
    progress = next(c for c in board["columns"] if c["id"] == "col-progress")
    assert [card["id"] for card in progress["cards"]] == ["card-5", "card-4"]


def test_move_card_to_another_column_updates_both_columns(client):
    response = client.post(
        "/api/cards/card-1/move", json={"column_id": "col-review", "position": 0}
    )
    assert response.status_code == 200

    board = client.get(f"/api/boards/{SEED_BOARD_ID}").json()
    backlog = next(c for c in board["columns"] if c["id"] == "col-backlog")
    review = next(c for c in board["columns"] if c["id"] == "col-review")
    assert [card["id"] for card in backlog["cards"]] == ["card-2"]
    assert [card["id"] for card in review["cards"]] == ["card-1", "card-6"]


def test_move_missing_card_returns_404(client):
    response = client.post(
        "/api/cards/missing/move", json={"column_id": "col-review", "position": 0}
    )
    assert response.status_code == 404


def test_move_card_to_missing_column_returns_404(client):
    response = client.post(
        "/api/cards/card-1/move", json={"column_id": "missing", "position": 0}
    )
    assert response.status_code == 404


def test_rename_column(client):
    response = client.patch("/api/columns/col-backlog", json={"title": "Ideas"})
    assert response.status_code == 200
    assert response.json()["title"] == "Ideas"

    board = client.get(f"/api/boards/{SEED_BOARD_ID}").json()
    assert board["columns"][0]["title"] == "Ideas"


def test_rename_missing_column_returns_404(client):
    response = client.patch("/api/columns/missing", json={"title": "x"})
    assert response.status_code == 404
