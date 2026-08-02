from app.database import SEED_BOARD_ID


def _first_board_id(client) -> str:
    boards = client.get("/api/boards").json()
    return boards[0]["id"]


def test_register_creates_a_user_with_a_seeded_empty_board(anon_client):
    response = anon_client.post(
        "/api/auth/register", json={"username": "alice", "password": "secret123"}
    )
    assert response.status_code == 201
    assert response.json()["username"] == "alice"

    board_id = _first_board_id(anon_client)
    board = anon_client.get(f"/api/boards/{board_id}").json()
    assert len(board["columns"]) == 5
    assert sum(len(column["cards"]) for column in board["columns"]) == 0


def test_register_rejects_a_duplicate_username(anon_client):
    anon_client.post("/api/auth/register", json={"username": "alice", "password": "secret123"})
    response = anon_client.post(
        "/api/auth/register", json={"username": "alice", "password": "other"}
    )
    assert response.status_code == 409


def test_login_with_valid_credentials_succeeds(anon_client):
    response = anon_client.post(
        "/api/auth/login", json={"username": "user", "password": "password"}
    )
    assert response.status_code == 200
    assert response.json()["username"] == "user"


def test_login_with_invalid_password_fails(anon_client):
    response = anon_client.post(
        "/api/auth/login", json={"username": "user", "password": "wrong"}
    )
    assert response.status_code == 401


def test_login_with_unknown_username_fails(anon_client):
    response = anon_client.post(
        "/api/auth/login", json={"username": "nobody", "password": "password"}
    )
    assert response.status_code == 401


def test_boards_require_authentication(anon_client):
    response = anon_client.get("/api/boards")
    assert response.status_code == 401


def test_logout_invalidates_the_session(anon_client):
    anon_client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert anon_client.get("/api/boards").status_code == 200

    logout_response = anon_client.post("/api/auth/logout")
    assert logout_response.status_code == 204

    assert anon_client.get("/api/boards").status_code == 401


def test_two_users_have_isolated_boards(anon_client):
    anon_client.post("/api/auth/register", json={"username": "alice", "password": "secret123"})
    alice_board_id = _first_board_id(anon_client)
    alice_board = anon_client.get(f"/api/boards/{alice_board_id}").json()
    alice_column = alice_board["columns"][0]["id"]
    anon_client.post(
        "/api/cards",
        json={"column_id": alice_column, "title": "Alice's card", "details": ""},
    )

    anon_client.post("/api/auth/logout")
    anon_client.post("/api/auth/login", json={"username": "user", "password": "password"})

    user_board = anon_client.get(f"/api/boards/{SEED_BOARD_ID}").json()
    user_titles = [
        card["title"] for column in user_board["columns"] for card in column["cards"]
    ]
    assert "Alice's card" not in user_titles

    # Alice's board is not reachable from the seeded user's session either.
    response = anon_client.get(f"/api/boards/{alice_board_id}")
    assert response.status_code == 404


def test_me_returns_the_authenticated_user(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["username"] == "user"
