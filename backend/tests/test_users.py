def test_change_password_with_wrong_current_password_fails(client):
    response = client.post(
        "/api/auth/change-password",
        json={"current_password": "wrong", "new_password": "newpass123"},
    )
    assert response.status_code == 401


def test_change_password_succeeds_and_new_password_works(anon_client):
    anon_client.post("/api/auth/login", json={"username": "user", "password": "password"})

    response = anon_client.post(
        "/api/auth/change-password",
        json={"current_password": "password", "new_password": "newpass123"},
    )
    assert response.status_code == 204

    anon_client.post("/api/auth/logout")

    old_login = anon_client.post(
        "/api/auth/login", json={"username": "user", "password": "password"}
    )
    assert old_login.status_code == 401

    new_login = anon_client.post(
        "/api/auth/login", json={"username": "user", "password": "newpass123"}
    )
    assert new_login.status_code == 200


def test_me_reports_the_users_role(client, admin_client):
    assert client.get("/api/auth/me").json()["role"] == "basico"
    assert admin_client.get("/api/auth/me").json()["role"] == "admin"


def test_admin_endpoints_reject_basic_users(client):
    assert client.get("/api/admin/users").status_code == 403
    assert (
        client.post(
            "/api/admin/users", json={"username": "x", "password": "secret123"}
        ).status_code
        == 403
    )


def test_admin_can_list_users(admin_client):
    response = admin_client.get("/api/admin/users")
    assert response.status_code == 200
    usernames = {u["username"] for u in response.json()}
    assert {"user", "admin"} <= usernames


def test_admin_can_create_a_user(admin_client):
    response = admin_client.post(
        "/api/admin/users",
        json={"username": "carol", "password": "secret123", "role": "basico"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "carol"
    assert body["role"] == "basico"

    usernames = {u["username"] for u in admin_client.get("/api/admin/users").json()}
    assert "carol" in usernames


def test_admin_create_user_rejects_duplicate_username(admin_client):
    admin_client.post(
        "/api/admin/users", json={"username": "carol", "password": "secret123"}
    )
    response = admin_client.post(
        "/api/admin/users", json={"username": "carol", "password": "other123"}
    )
    assert response.status_code == 409


def test_admin_can_change_a_users_role(admin_client):
    created = admin_client.post(
        "/api/admin/users", json={"username": "carol", "password": "secret123"}
    ).json()

    response = admin_client.patch(f"/api/admin/users/{created['id']}", json={"role": "admin"})
    assert response.status_code == 200
    assert response.json()["role"] == "admin"


def test_admin_can_reset_a_users_password(admin_client, anon_client):
    created = admin_client.post(
        "/api/admin/users", json={"username": "carol", "password": "secret123"}
    ).json()

    response = admin_client.patch(
        f"/api/admin/users/{created['id']}", json={"password": "brandnew123"}
    )
    assert response.status_code == 200

    login = anon_client.post(
        "/api/auth/login", json={"username": "carol", "password": "brandnew123"}
    )
    assert login.status_code == 200


def test_cannot_demote_the_only_remaining_admin(admin_client):
    admin_id = admin_client.get("/api/auth/me").json()["id"]

    response = admin_client.patch(f"/api/admin/users/{admin_id}", json={"role": "basico"})
    assert response.status_code == 400


def test_cannot_delete_the_only_remaining_admin(admin_client):
    admin_id = admin_client.get("/api/auth/me").json()["id"]

    response = admin_client.delete(f"/api/admin/users/{admin_id}")
    assert response.status_code == 400


def test_admin_can_delete_a_user(admin_client):
    created = admin_client.post(
        "/api/admin/users", json={"username": "carol", "password": "secret123"}
    ).json()

    response = admin_client.delete(f"/api/admin/users/{created['id']}")
    assert response.status_code == 204

    usernames = {u["username"] for u in admin_client.get("/api/admin/users").json()}
    assert "carol" not in usernames


def test_update_missing_user_returns_404(admin_client):
    response = admin_client.patch("/api/admin/users/999999", json={"role": "admin"})
    assert response.status_code == 404


def test_registered_users_are_always_basic(anon_client):
    response = anon_client.post(
        "/api/auth/register", json={"username": "dave", "password": "secret123"}
    )
    assert response.json()["role"] == "basico"
