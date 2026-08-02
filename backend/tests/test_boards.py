from app.database import SEED_BOARD_ID


def test_list_boards_returns_the_seeded_board(client):
    response = client.get("/api/boards")
    assert response.status_code == 200

    boards = response.json()
    assert [board["id"] for board in boards] == [SEED_BOARD_ID]
    assert boards[0]["name"] == "Mi tablero"


def test_create_board_adds_default_columns_and_no_cards(client):
    response = client.post("/api/boards", json={"name": "Second board"})
    assert response.status_code == 201

    board = response.json()
    assert board["name"] == "Second board"
    assert len(board["columns"]) == 5
    assert sum(len(column["cards"]) for column in board["columns"]) == 0

    boards = client.get("/api/boards").json()
    assert [b["name"] for b in boards] == ["Mi tablero", "Second board"]


def test_boards_are_independent_of_each_other(client):
    created = client.post("/api/boards", json={"name": "Second board"}).json()
    second_column = created["columns"][0]["id"]

    client.post(
        "/api/cards",
        json={"column_id": second_column, "title": "Only on board two", "details": ""},
    )

    seeded_board = client.get(f"/api/boards/{SEED_BOARD_ID}").json()
    seeded_titles = [
        card["title"] for column in seeded_board["columns"] for card in column["cards"]
    ]
    assert "Only on board two" not in seeded_titles

    second_board = client.get(f"/api/boards/{created['id']}").json()
    second_titles = [
        card["title"] for column in second_board["columns"] for card in column["cards"]
    ]
    assert "Only on board two" in second_titles


def test_rename_board(client):
    created = client.post("/api/boards", json={"name": "Old name"}).json()

    response = client.patch(f"/api/boards/{created['id']}", json={"name": "New name"})
    assert response.status_code == 200
    assert response.json()["name"] == "New name"

    boards = client.get("/api/boards").json()
    renamed = next(b for b in boards if b["id"] == created["id"])
    assert renamed["name"] == "New name"


def test_rename_missing_board_returns_404(client):
    response = client.patch("/api/boards/missing", json={"name": "x"})
    assert response.status_code == 404


def test_delete_board_removes_its_columns_and_cards(client):
    created = client.post("/api/boards", json={"name": "Deletable"}).json()

    response = client.delete(f"/api/boards/{created['id']}")
    assert response.status_code == 204

    assert client.get(f"/api/boards/{created['id']}").status_code == 404
    boards = client.get("/api/boards").json()
    assert created["id"] not in [b["id"] for b in boards]


def test_cannot_delete_the_only_remaining_board(client):
    response = client.delete(f"/api/boards/{SEED_BOARD_ID}")
    assert response.status_code == 400

    assert client.get(f"/api/boards/{SEED_BOARD_ID}").status_code == 200


def test_cannot_access_another_users_board(client, other_client):
    other_client.post(
        "/api/auth/register", json={"username": "bob", "password": "secret123"}
    )
    bobs_board_id = other_client.get("/api/boards").json()[0]["id"]

    response = client.get(f"/api/boards/{bobs_board_id}")
    assert response.status_code == 404


def test_delete_missing_board_returns_404(client):
    response = client.delete("/api/boards/missing")
    assert response.status_code == 404
