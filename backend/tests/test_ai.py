import asyncio

from app import ai, ai_routes
from app.database import SEED_BOARD_ID


class FakeResponse:
    def __init__(self, payload, error=None):
        self._payload = payload
        self._error = error

    def raise_for_status(self):
        if self._error:
            raise self._error

    def json(self):
        return self._payload


class FakeAsyncClient:
    calls: list[dict] = []
    response = FakeResponse({"choices": [{"message": {"content": "4"}}]})

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, headers=None, json=None):
        FakeAsyncClient.calls.append({"url": url, "headers": headers, "json": json})
        return FakeAsyncClient.response


def test_ask_ai_sends_the_expected_request_and_parses_the_answer(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(ai, "httpx", type("M", (), {"AsyncClient": FakeAsyncClient}))
    FakeAsyncClient.calls = []
    FakeAsyncClient.response = FakeResponse({"choices": [{"message": {"content": "4"}}]})

    result = asyncio.run(ai.ask_ai("What is 2+2?"))

    assert result == "4"
    assert len(FakeAsyncClient.calls) == 1
    call = FakeAsyncClient.calls[0]
    assert call["url"] == ai.OPENROUTER_URL
    assert call["headers"]["Authorization"] == "Bearer test-key"
    assert call["json"]["model"] == ai.MODEL
    assert call["json"]["messages"] == [{"role": "user", "content": "What is 2+2?"}]


def test_ask_ai_propagates_http_errors(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(ai, "httpx", type("M", (), {"AsyncClient": FakeAsyncClient}))
    FakeAsyncClient.calls = []
    FakeAsyncClient.response = FakeResponse({}, error=RuntimeError("upstream failure"))

    try:
        asyncio.run(ai.ask_ai("What is 2+2?"))
        assert False, "expected an exception"
    except RuntimeError:
        pass


def test_ai_ping_returns_the_answer(client, monkeypatch):
    async def fake_ask_ai(prompt: str) -> str:
        return "4"

    monkeypatch.setattr(ai_routes, "ask_ai", fake_ask_ai)

    response = client.get("/api/ai/ping")

    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == "4"
    assert "question" in body


def test_ai_ping_returns_502_when_the_ai_call_fails(client, monkeypatch):
    async def failing_ask_ai(prompt: str) -> str:
        raise RuntimeError("upstream failure")

    monkeypatch.setattr(ai_routes, "ask_ai", failing_ask_ai)

    response = client.get("/api/ai/ping")

    assert response.status_code == 502


def test_parse_ai_chat_output_parses_a_clean_json_object():
    output = ai.parse_ai_chat_output('{"reply": "hi", "actions": []}')

    assert output.reply == "hi"
    assert output.actions == []


def test_parse_ai_chat_output_strips_stray_text_around_the_json_object():
    output = ai.parse_ai_chat_output(' oops{"reply": "hi", "actions": []}\ntrailing')

    assert output.reply == "hi"
    assert output.actions == []


def test_parse_ai_chat_output_falls_back_to_raw_text_when_not_json():
    output = ai.parse_ai_chat_output("no json here at all")

    assert output.reply == "no json here at all"
    assert output.actions == []


def _fake_ask_ai_chat(raw_content: str):
    async def fake(board, history, message):
        return raw_content

    return fake


def test_ai_chat_replies_with_text_only_and_leaves_the_board_unchanged(client, monkeypatch):
    monkeypatch.setattr(
        ai_routes, "ask_ai_chat", _fake_ask_ai_chat('{"reply": "Hello there", "actions": []}')
    )

    before = client.get(f"/api/boards/{SEED_BOARD_ID}").json()
    response = client.post(
        "/api/ai/chat", json={"board_id": SEED_BOARD_ID, "message": "hi", "history": []}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Hello there"
    assert body["board"] == before


def test_ai_chat_applies_a_valid_create_card_action(client, monkeypatch):
    raw = (
        '{"reply": "Created it", "actions": [{"type": "create_card", '
        '"column_id": "col-backlog", "card_id": null, "title": "New task", '
        '"details": null, "position": null}]}'
    )
    monkeypatch.setattr(ai_routes, "ask_ai_chat", _fake_ask_ai_chat(raw))

    response = client.post(
        "/api/ai/chat",
        json={"board_id": SEED_BOARD_ID, "message": "add a card", "history": []},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Created it"
    backlog = next(c for c in body["board"]["columns"] if c["id"] == "col-backlog")
    assert any(card["title"] == "New task" for card in backlog["cards"])


def test_ai_chat_rejects_an_invalid_action_without_corrupting_the_board(client, monkeypatch):
    raw = (
        '{"reply": "Done", "actions": [{"type": "update_card", '
        '"column_id": null, "card_id": "does-not-exist", "title": "x", '
        '"details": null, "position": null}]}'
    )
    monkeypatch.setattr(ai_routes, "ask_ai_chat", _fake_ask_ai_chat(raw))

    before = client.get(f"/api/boards/{SEED_BOARD_ID}").json()
    response = client.post(
        "/api/ai/chat",
        json={"board_id": SEED_BOARD_ID, "message": "edit a card", "history": []},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Done"
    assert body["board"] == before
