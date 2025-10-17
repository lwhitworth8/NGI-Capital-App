import os
from typing import Any, Iterable, Optional


_client = None


def is_enabled() -> bool:
    return bool(os.getenv("ENABLE_SLACK")) and bool(os.getenv("SLACK_BOT_TOKEN"))


def _get_client():
    global _client
    if _client is not None:
        return _client
    try:
        from slack_sdk import WebClient  # type: ignore
    except Exception:
        return None
    token = os.getenv("SLACK_BOT_TOKEN")
    if not token:
        return None
    _client = WebClient(token=token)
    return _client


def channel_prefix() -> str:
    return os.getenv("SLACK_CHANNEL_PREFIX", "proj-")


def build_channel_name(project_code: str) -> str:
    base = f"{channel_prefix()}{(project_code or '').strip().lower()}-team"
    # sanitize: lowercase, dashes and letters only
    safe = ''.join(ch if (ch.isalnum() or ch in ('-', '_')) else '-' for ch in base.lower())
    while '--' in safe:
        safe = safe.replace('--', '-')
    return safe[:79]


def ensure_project_channel(project_code: str) -> Optional[dict[str, Any]]:
    if not is_enabled():
        return None
    client = _get_client()
    if client is None:
        return None
    name = build_channel_name(project_code)
    try:
        # Try to find existing channel by name
        resp = client.conversations_list(types="public_channel,private_channel", limit=1000)
        for ch in (resp.get('channels') or []):
            if (ch.get('name') or '').lower() == name:
                return {"id": ch.get('id'), "name": name}
    except Exception:
        pass
    try:
        created = client.conversations_create(name=name, is_private=True)
        ch = created.get('channel') or {}
        return {"id": ch.get('id'), "name": name}
    except Exception as e:
        # name_taken: try to find again
        try:
            resp = client.conversations_list(types="public_channel,private_channel", limit=1000)
            for ch in (resp.get('channels') or []):
                if (ch.get('name') or '').lower() == name:
                    return {"id": ch.get('id'), "name": name}
        except Exception:
            return None
    return None


def invite_members(channel_id: str, emails: Iterable[str]) -> None:
    if not is_enabled():
        return
    client = _get_client()
    if client is None:
        return
    user_ids: list[str] = []
    for em in emails:
        em = (em or '').strip()
        if not em:
            continue
        try:
            u = client.users_lookupByEmail(email=em)
            uid = ((u or {}).get('user') or {}).get('id')
            if uid:
                user_ids.append(uid)
        except Exception:
            continue
    if not user_ids:
        return
    try:
        client.conversations_invite(channel=channel_id, users=','.join(user_ids))
    except Exception:
        # Already in channel or other benign errors are ignored
        pass


def post_message(channel_id: str, text: str, blocks: Optional[list[dict[str, Any]]] = None) -> None:
    if not is_enabled():
        return
    client = _get_client()
    if client is None:
        return
    try:
        client.chat_postMessage(channel=channel_id, text=text, blocks=blocks)
    except Exception:
        pass


def channel_web_link(channel_id: str) -> Optional[str]:
    team = os.getenv('SLACK_WORKSPACE_ID')
    if not channel_id:
        return None
    if team:
        return f"https://app.slack.com/client/{team}/{channel_id}"
    return None

