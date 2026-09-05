"""Registration and login.

These exist because the app shipped with passlib against bcrypt 5, which raised
on every hash call: nobody could create an account or log in at all.
"""


def test_register_returns_a_token_and_profile(client, account):
    assert account["token"]
    assert account["user"]["email"] == account["email"]


def test_login_with_the_right_password(client, account):
    res = client.post("/api/auth/login",
                      json={"email": account["email"], "password": account["password"]})
    assert res.status_code == 200, res.text
    assert res.json()["access_token"]


def test_login_with_the_wrong_password_is_refused(client, account):
    res = client.post("/api/auth/login",
                      json={"email": account["email"], "password": "not-the-password"})
    assert res.status_code == 401


def test_login_for_an_unknown_account_is_refused(client):
    res = client.post("/api/auth/login",
                      json={"email": "nobody@example.com", "password": "whatever"})
    assert res.status_code == 401


def test_a_very_long_password_is_accepted(client):
    """bcrypt refuses anything past 72 bytes, so both hashing and checking
    truncate identically. Without that, long passwords raised a 500."""
    import uuid
    email = f"long_{uuid.uuid4().hex[:10]}@example.com"
    password = "x" * 200
    assert client.post("/api/auth/register",
                       json={"name": "Long", "email": email, "password": password}).status_code == 200
    assert client.post("/api/auth/login",
                       json={"email": email, "password": password}).status_code == 200


def test_passwords_differing_after_72_bytes_are_not_interchangeable(client):
    """Truncation is a real tradeoff; this documents where the boundary sits."""
    import uuid
    email = f"trunc_{uuid.uuid4().hex[:10]}@example.com"
    created = client.post("/api/auth/register",
                          json={"name": "Trunc", "email": email, "password": "a" * 72})
    assert created.status_code == 200, created.text
    # Same first 72 bytes: bcrypt cannot tell these apart, and neither can we.
    assert client.post("/api/auth/login",
                       json={"email": email, "password": "a" * 72 + "different"}).status_code == 200
    # A different 72-byte prefix must still fail.
    assert client.post("/api/auth/login",
                       json={"email": email, "password": "b" * 72}).status_code == 401


def test_duplicate_email_is_rejected_with_a_readable_reason(client, account):
    res = client.post("/api/auth/register",
                      json={"name": "Copy", "email": account["email"], "password": "hunter22"})
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]


def test_me_returns_the_signed_in_user(client, account):
    res = client.get("/api/auth/me", headers=account["headers"])
    assert res.status_code == 200
    assert res.json()["email"] == account["email"]


def test_me_rejects_a_forged_token(client):
    """The frontend relies on a 401 here to end a dead session. When this
    returned anything else, expired logins kept showing the user as signed in."""
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer forged.token.value"})
    assert res.status_code == 401


def test_me_without_a_token_is_unauthorised(client):
    assert client.get("/api/auth/me").status_code == 401


def test_short_password_reports_which_field_failed(client):
    res = client.post("/api/auth/register",
                      json={"name": "Al", "email": "short@example.com", "password": "abc"})
    assert res.status_code == 422
    detail = res.json()["detail"]
    assert any(d["loc"][-1] == "password" for d in detail), detail
