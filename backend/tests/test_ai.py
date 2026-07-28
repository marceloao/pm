import asyncio

from app import ai, ai_routes


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
