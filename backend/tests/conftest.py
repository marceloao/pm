import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def anon_client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def client(anon_client):
    anon_client.post("/api/auth/login", json={"username": "user", "password": "password"})
    return anon_client


@pytest.fixture
def other_client(anon_client):
    """A second, independent cookie jar against the same database as `anon_client`/`client`."""
    from app.main import app

    with TestClient(app) as second_client:
        yield second_client


@pytest.fixture
def admin_client(anon_client):
    """A second, independent cookie jar logged in as the seeded admin user."""
    from app.main import app

    with TestClient(app) as second_client:
        second_client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
        yield second_client
