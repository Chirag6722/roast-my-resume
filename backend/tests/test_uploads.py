"""Parsing uploads, and explaining failures in language a job seeker can act on.

The app used to advertise .doc support it did not have, and surfaced library
internals like "File is not a zip file" straight to the user.
"""
import pytest

from conftest import OLE_HEADER, DOCX_MIME, SHORT_RESUME


def upload(client, name, data, mime="application/octet-stream", headers=None):
    return client.post("/api/roast", data={"intensity": "medium"},
                       headers=headers or {}, files={"file": (name, data, mime)})


def test_a_text_resume_is_parsed(client, guest):
    res = upload(client, "ok.txt", SHORT_RESUME.encode(), "text/plain", guest)
    assert res.status_code == 200
    assert res.json()["file_name"] == "ok.txt"


def test_pasted_text_is_parsed(client, guest):
    res = client.post("/api/roast", data={"resume_text": SHORT_RESUME, "intensity": "mild"},
                      headers=guest)
    assert res.status_code == 200


def test_no_input_at_all_still_returns_the_built_in_sample(client):
    assert client.post("/api/roast", data={"intensity": "medium"}).status_code == 200


@pytest.mark.parametrize("name,data,mime,expected", [
    ("renamed.docx", OLE_HEADER, DOCX_MIME, "legacy Word"),
    ("real.docx", b"not a zip", DOCX_MIME, "real .docx"),
    ("broken.pdf", b"%PDF-1.4 truncated", "application/pdf", "corrupted or password protected"),
    ("empty.txt", b"", "text/plain", "readable text"),
])
def test_unreadable_uploads_explain_themselves(client, name, data, mime, expected):
    res = upload(client, name, data, mime)
    assert res.status_code == 400, res.text
    assert expected in res.json()["detail"], res.json()["detail"]


def test_a_legacy_doc_says_how_to_fix_it(client):
    detail = upload(client, "old.docx", OLE_HEADER, DOCX_MIME).json()["detail"]
    assert ".docx or PDF" in detail


@pytest.mark.parametrize("name,data,mime", [
    ("x.pdf", b"%PDF-1.4 truncated", "application/pdf"),
    ("x.docx", b"not a zip", DOCX_MIME),
])
def test_library_internals_never_reach_the_user(client, name, data, mime):
    body = upload(client, name, data, mime).text
    for leak in ("Traceback", "BadZipFile", "PdfReadError", "File is not a zip file"):
        assert leak not in body, f"{leak} leaked to the client"


def test_an_image_only_pdf_suggests_pasting_instead(client):
    """A scanned resume parses to no text, which is a real and common case."""
    import io
    from pypdf import PdfWriter
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)

    res = upload(client, "scan.pdf", buf.getvalue(), "application/pdf")
    assert res.status_code == 400
    assert "paste the text" in res.json()["detail"]
