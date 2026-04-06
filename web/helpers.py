"""Shared web route helpers."""

import httpx
from quart import current_app, render_template, session

from core.auth.session import SessionStore
from core.records import upload_blob


async def get_user() -> dict | None:
    """Get the current logged-in user's OAuth session."""
    did = session.get("did")
    if not did:
        return None
    store: SessionStore = current_app.session_store
    return store.get_session(did)


async def session_updater(did: str, field: str, value: str):
    """Callback for pds_request to persist nonce updates."""
    store: SessionStore = current_app.session_store
    store.update_session_field(did, field, value)


async def upload_attachments(
    client: httpx.AsyncClient, user: dict
) -> list[dict] | None:
    """Upload file attachments from the current request. Returns None if empty."""
    from quart import request

    attachments = []
    files = (await request.files).getlist("attachments")
    for f in files:
        if f.filename:
            data = f.read()
            blob_ref = await upload_blob(
                client,
                user,
                data,
                f.content_type or "application/octet-stream",
                session_updater,
            )
            attachments.append({"file": blob_ref, "name": f.filename})
    return attachments or None
