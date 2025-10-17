"""
ChatKit session provisioning endpoints.

Provides a small FastAPI wrapper to create ChatKit sessions using
OpenAI's HTTP API so the frontend can fetch a client_secret.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import httpx
import secrets
import logging

from services.api.auth_deps import require_clerk_user
from services.api.database import get_db
from services.api.routes.chatkit_server import NGIChatKitServer, NGIChatKitStore


router = APIRouter(prefix="/api/chatkit", tags=["chatkit"])
logger = logging.getLogger(__name__)

# Initialize store and server
store = NGIChatKitStore()
chatkit_server = None

def get_chatkit_server():
    global chatkit_server
    if chatkit_server is None:
        db = next(get_db())
        chatkit_server = NGIChatKitServer(store, db)
    return chatkit_server


class SessionRequest(BaseModel):
    user: Optional[str] = None
    deviceId: Optional[str] = None


@router.post("/session")
async def create_chatkit_session(payload: SessionRequest) -> Dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")
    workflow_id = os.getenv("NGI_NEX_CHATKIT_WORKFLOW_ID", "").strip()
    if not workflow_id:
        raise HTTPException(status_code=503, detail="NGI_NEX_CHATKIT_WORKFLOW_ID not configured")

    base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com").rstrip("/")
    url = f"{base}/v1/chatkit/sessions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1",
    }
    user = (payload.user or payload.deviceId or f"anon_{secrets.token_hex(6)}").strip()
    body = {
        "workflow": {"id": workflow_id},
        "user": user,
    }

    # Optional: project header if present
    project = os.getenv("OPENAI_PROJECT", "").strip()
    if project:
        headers["OpenAI-Project"] = project

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            text = resp.text
            if resp.status_code != 200:
                logger.error("ChatKit session create failed", extra={"status": resp.status_code, "body": text})
                raise HTTPException(status_code=500, detail={
                    "error": "chatkit session failed",
                    "status": resp.status_code,
                    "body": text,
                })
            data = resp.json()
            client_secret = data.get("client_secret") or data.get("clientSecret")
            if not client_secret:
                raise HTTPException(status_code=500, detail={
                    "error": "chatkit response missing client_secret",
                    "body": data,
                })
            return {"client_secret": client_secret}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("ChatKit session error")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def chatkit_message_handler(
    request: Request,
    user=Depends(require_clerk_user)
):
    """Handle incoming ChatKit messages and stream responses"""
    server = get_chatkit_server()
    body = await request.body()
    
    # Pass user context
    context = {
        "user_id": user.get("sub"),
        "entity_id": request.query_params.get("entity_id")
    }
    
    result = await server.process(body, context)
    
    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    return Response(content=result.json, media_type="application/json")


@router.get("/diagnose")
async def chatkit_diagnose() -> Dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    workflow_id = os.getenv("NGI_NEX_CHATKIT_WORKFLOW_ID", "").strip()
    base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com").rstrip("/")
    url = f"{base}/v1/chatkit/sessions"
    headers = {
        "Authorization": "<redacted>" if api_key else "<missing>",
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1",
    }
    return {
        "url": url,
        "workflow_id": workflow_id,
        "headers": headers,
        "env_present": bool(api_key) and bool(workflow_id),
    }

