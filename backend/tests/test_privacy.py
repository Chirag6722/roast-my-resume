"""Who can see what.

Two real leaks are covered here: guests could read every other guest's roasts,
and the public landing-page feed published real uploaded filenames, which
usually contain the candidate's full name.
"""
from conftest import SHORT_RESUME


def roast(client, headers, text=SHORT_RESUME, intensity="medium"):
    res = client.post("/api/roast",
                      data={"resume_text": text, "intensity": intensity},
                      headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


# ----------------------------------------------------------------- history scoping
def test_a_guest_sees_only_their_own_roasts(client, guest, other_guest):
    mine = roast(client, guest)
    theirs = roast(client, other_guest)

    ids = {r["id"] for r in client.get("/api/history", headers=guest).json()}
    assert mine["id"] in ids
    assert theirs["id"] not in ids


def test_a_browser_with_no_guest_id_gets_nothing(client, guest):
    roast(client, guest)
    assert client.get("/api/history").json() == []


def test_a_signed_in_user_sees_only_their_own(client, account, guest):
    headers = {**account["headers"], **guest}
    mine = roast(client, headers)
    guest_only = roast(client, guest)

    ids = {r["id"] for r in client.get("/api/history", headers=headers).json()}
    assert mine["id"] in ids
    assert guest_only["id"] not in ids, "a guest roast leaked into the account's history"


def test_history_is_newest_first(client, guest):
    first = roast(client, guest)
    second = roast(client, guest)
    ids = [r["id"] for r in client.get("/api/history", headers=guest).json()]
    assert ids.index(second["id"]) < ids.index(first["id"])


# ----------------------------------------------------------------- ownership
def test_another_guest_cannot_read_your_roast(client, guest, other_guest):
    mine = roast(client, guest)
    assert client.get(f"/api/history/{mine['id']}", headers=guest).status_code == 200
    assert client.get(f"/api/history/{mine['id']}", headers=other_guest).status_code == 404


def test_a_guest_cannot_read_an_accounts_roast(client, account, guest, other_guest):
    theirs = roast(client, {**account["headers"], **guest})
    assert client.get(f"/api/history/{theirs['id']}", headers=other_guest).status_code == 404


def test_another_guest_cannot_delete_your_roast(client, guest, other_guest):
    mine = roast(client, guest)
    assert client.delete(f"/api/history/{mine['id']}", headers=other_guest).status_code == 404
    # Still there afterwards.
    assert client.get(f"/api/history/{mine['id']}", headers=guest).status_code == 200


def test_you_can_delete_your_own_roast(client, guest):
    mine = roast(client, guest)
    assert client.delete(f"/api/history/{mine['id']}", headers=guest).status_code == 200
    assert client.get(f"/api/history/{mine['id']}", headers=guest).status_code == 404


def test_a_missing_roast_and_a_forbidden_one_are_indistinguishable(client, guest, other_guest):
    """Both answer 404 so an id cannot be probed for existence."""
    mine = roast(client, guest)
    forbidden = client.get(f"/api/history/{mine['id']}", headers=other_guest).status_code
    missing = client.get("/api/history/does-not-exist", headers=other_guest).status_code
    assert forbidden == missing == 404


# ----------------------------------------------------------------- the public feed
def test_the_public_feed_never_publishes_a_filename(client, guest):
    res = client.post("/api/roast", data={"intensity": "medium"}, headers=guest,
                      files={"file": ("Ayush_Kumar_Resume.txt", SHORT_RESUME.encode(), "text/plain")})
    assert res.status_code == 200, res.text

    feed = client.get("/api/live-feed").json()
    payload = str(feed)
    assert "Ayush" not in payload, "a real name reached the public feed"
    assert ".txt" not in payload and ".pdf" not in payload
    assert all("file_name" not in item for item in feed["items"])


def test_the_feed_describes_the_format_instead(client, guest):
    roast(client, guest)
    kinds = {item["file_kind"] for item in client.get("/api/live-feed").json()["items"]}
    assert kinds, "the feed returned nothing to describe"
    assert "Pasted resume" in kinds


def test_the_owner_still_sees_their_own_filename(client, guest):
    """Redacting the public feed must not hide it from the person it belongs to."""
    client.post("/api/roast", data={"intensity": "medium"}, headers=guest,
                files={"file": ("My_Resume.txt", SHORT_RESUME.encode(), "text/plain")})
    names = {h["file_name"] for h in client.get("/api/history", headers=guest).json()}
    assert "My_Resume.txt" in names


def test_signed_in_roasts_stay_out_of_the_public_feed(client, account, guest):
    private = roast(client, {**account["headers"], **guest})
    feed_ids = {item["id"] for item in client.get("/api/live-feed").json()["items"]}
    assert private["id"] not in feed_ids
