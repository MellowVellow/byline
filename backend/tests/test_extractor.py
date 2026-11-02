import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import asyncio
from unittest.mock import patch

import httpx

from app.services import extractor
from app.services.extractor import _validate_fetch_url, extract_page

BODY = "<html><head><title>T</title></head><body><p>" + ("word " * 300) + "</p></body></html>"


class FakeResp:
    def __init__(self, status=200, headers=None, text=""):
        self.status_code = status
        self.headers = headers or {}
        self._text = text

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("err", request=None, response=None)  # type: ignore[arg-type]

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def aiter_text(self):
        yield self._text


class FakeClient:
    def __init__(self, handler):
        self.handler = handler
        self.calls: list[str] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    def stream(self, method, url):
        self.calls.append(url)
        return self.handler(url)


def run(coro):
    return asyncio.run(coro)


def test_validate_rejects_dangerous_urls():
    assert not _validate_fetch_url("http://127.0.0.1/admin")
    assert not _validate_fetch_url("http://169.254.169.254/latest/meta-data")
    assert not _validate_fetch_url("http://10.0.0.5:8080/x")
    assert not _validate_fetch_url("https://example.com:8443/x")
    assert not _validate_fetch_url("http://user:pass@example.com/")
    assert not _validate_fetch_url("ftp://example.com/x")
    assert not _validate_fetch_url("file:///etc/passwd")
    assert not _validate_fetch_url("http://localhost/x")
    assert _validate_fetch_url("https://8.8.8.8/x")


def test_redirect_to_private_blocked_and_never_fetched():
    def handler(url):
        if url.endswith("/a"):
            return FakeResp(302, {"location": "http://127.0.0.1/secret"})
        return FakeResp(200, {}, BODY)

    client = FakeClient(handler)
    with patch.object(httpx, "AsyncClient", return_value=client):
        assert run(extract_page("https://8.8.8.8/a")) is None
    assert client.calls == ["https://8.8.8.8/a"]


def test_redirect_to_disallowed_scheme_blocked():
    def handler(url):
        return FakeResp(302, {"location": "file:///etc/passwd"})

    client = FakeClient(handler)
    with patch.object(httpx, "AsyncClient", return_value=client):
        assert run(extract_page("https://8.8.8.8/a")) is None
    assert client.calls == ["https://8.8.8.8/a"]


def test_too_many_redirects_refused():
    def handler(url):
        return FakeResp(302, {"location": "https://8.8.8.8/loop"})

    client = FakeClient(handler)
    with patch.object(httpx, "AsyncClient", return_value=client):
        assert run(extract_page("https://8.8.8.8/loop")) is None
    assert len(client.calls) == extractor.MAX_REDIRECTS + 1


def test_relative_redirect_followed():
    def handler(url):
        if url.endswith("/a"):
            return FakeResp(302, {"location": "/b"})
        return FakeResp(200, {}, BODY)

    client = FakeClient(handler)
    with patch.object(httpx, "AsyncClient", return_value=client):
        page = run(extract_page("https://8.8.8.8/a"))
    assert page is not None and page["url"] == "https://8.8.8.8/a"
    assert client.calls == ["https://8.8.8.8/a", "https://8.8.8.8/b"]
