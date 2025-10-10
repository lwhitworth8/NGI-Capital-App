"""
Projects AI helper endpoints

Wraps OpenAI Agent Builder workflow run to generate title/summary/description
drafts based on partial project inputs.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import json
import httpx
import logging


router = APIRouter(prefix="/api/projects", tags=["projects"])
logger = logging.getLogger(__name__)


class AiGenerateRequest(BaseModel):
    projectName: Optional[str] = Field(default="")
    summary: Optional[str] = Field(default="")
    clients: List[str] = Field(default_factory=list)
    existingDescription: Optional[str] = Field(default="")
    prompt: Optional[str] = Field(default="")


class AiGenerateResponse(BaseModel):
    title: str
    summary: str
    description: str


def _get_openai_config() -> Dict[str, str]:
    """Resolve OpenAI Agent config from environment.

    Returns dict with api_key, agent_id, workflow_id, and base_url.
    Raises HTTPException when required values are missing.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    workflow_id = os.getenv("NGI_AGENT_WORKFLOW_ID", "").strip()
    base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com").rstrip("/")
    project = os.getenv("OPENAI_PROJECT", "").strip()

    if not api_key or not workflow_id:
        raise HTTPException(status_code=503, detail="OpenAI API key or workflow ID not configured")
    return {
        "api_key": api_key,
        "workflow_id": workflow_id,
        "base_url": base,
        "project": project,
    }


async def _run_openai_workflow(cfg: Dict[str, str], payload: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{cfg['base_url']}/v1/workflows/{cfg['workflow_id']}/runs"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {cfg['api_key']}",
        # Workflows API often requires beta header; include by default.
        "OpenAI-Beta": "workflows=v1",
    }
    # Optional project scoping (required for sk-proj- keys)
    if cfg.get("project"):
        headers["OpenAI-Project"] = cfg["project"]
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Log request details without secrets
        safe_headers = {k: ("<redacted>" if k.lower() == "authorization" else v) for k, v in headers.items()}
        logger.info("AI Workflows primary call", extra={"url": url, "headers": safe_headers, "body": payload})
        resp = await client.post(url, headers=headers, json=payload)
        text = resp.text
        if resp.status_code != 200:
            # Attempt alternate workflows run endpoint shape if the first path is rejected
            try:
                j = json.loads(text)
            except Exception:
                j = {"raw": text}
            msg = json.dumps(j)
            if "Invalid URL" in msg or resp.status_code in (404, 400):
                alt_url = f"{cfg['base_url']}/v1/workflows/runs"
                alt_body = {"workflow_id": cfg["workflow_id"], **payload}
                wf_ver = os.getenv("NGI_AGENT_WORKFLOW_VERSION", "published").strip()
                if wf_ver:
                    alt_body["workflow_version"] = wf_ver
                logger.info("AI Workflows fallback call", extra={"url": alt_url, "headers": safe_headers, "body": alt_body})
                alt = await client.post(alt_url, headers=headers, json=alt_body)
                if alt.status_code == 200:
                    try:
                        return alt.json()
                    except Exception:
                        return {"raw": alt.text}
                else:
                    raise HTTPException(status_code=500, detail={
                        "error": "Agent workflow error",
                        "primary": text,
                        "fallback_status": alt.status_code,
                        "fallback": alt.text,
                        "used_path": url,
                        "fallback_path": alt_url,
                    })
            raise HTTPException(status_code=500, detail={
                "error": "Agent workflow error",
                "primary": text,
                "used_path": url,
            })
        try:
            return json.loads(text)
        except Exception:
            return {"raw": text}


async def _fallback_via_chat(cfg: Dict[str, str], input_obj: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback using Chat Completions to generate a JSON draft.
    Returns dict with keys: title, summary, description
    """
    model = os.getenv("OPENAI_FALLBACK_MODEL", "gpt-4o-mini").strip()
    url = f"{cfg['base_url']}/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {cfg['api_key']}",
    }
    sys_prompt = (
        "You generate concise project drafts in JSON. "
        "Return strictly a compact JSON object with keys: title, summary, description. "
        "Do not include markdown or any text outside JSON."
    )
    user_prompt = {
        "project_name": input_obj.get("project_name", ""),
        "summary": input_obj.get("summary", ""),
        "clients": input_obj.get("clients", []),
        "existing_description": input_obj.get("existing_description", ""),
        "prompt": input_obj.get("prompt", ""),
    }
    body = {
        "model": model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": json.dumps(user_prompt)},
        ],
        "temperature": 0.3,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        safe_headers = {k: ("<redacted>" if k.lower() == "authorization" else v) for k, v in headers.items()}
        logger.info("AI fallback chat call", extra={"url": url, "headers": safe_headers})
        resp = await client.post(url, headers=headers, json=body)
        t = resp.text
        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail={
                "error": "Fallback chat completion failed",
                "status": resp.status_code,
                "body": t,
            })
        try:
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return {
                "title": str(parsed.get("title") or input_obj.get("project_name", ""))[:200],
                "summary": str(parsed.get("summary") or input_obj.get("summary", ""))[:500],
                "description": str(parsed.get("description") or input_obj.get("existing_description", "")),
            }
        except Exception:
            # As a last resort, construct a minimal draft
            return {
                "title": input_obj.get("project_name", "").strip() or "Untitled Project",
                "summary": input_obj.get("summary", "").strip() or "",
                "description": input_obj.get("existing_description", "").strip() or "",
            }


@router.post("/ai/generate", response_model=AiGenerateResponse)
async def generate_ai_draft(body: AiGenerateRequest) -> AiGenerateResponse:
    cfg = _get_openai_config()

    # Compose input expected by the Agent workflow
    input_obj: Dict[str, Any] = {
        "project_name": (body.projectName or "").strip(),
        "summary": (body.summary or "").strip(),
        "clients": list(body.clients or []),
        "existing_description": (body.existingDescription or "").strip(),
        "prompt": (body.prompt or "").strip(),
    }

    attempts: List[Dict[str, Any]] = []
    try:
        result = await _run_openai_workflow(cfg, {"input": input_obj})
    except HTTPException as e:
        # Attach detailed attempts for visibility in UI during dev
        detail = e.detail if isinstance(e.detail, dict) else {"primary": str(e.detail)}
        attempts.append({"workflow_error": detail})
        # Optional fallback to keep UI working
        if os.getenv("OPENAI_FALLBACK_ENABLED", "1").strip().lower() in ("1", "true", "yes"):
            fb = await _fallback_via_chat(cfg, input_obj)
            return AiGenerateResponse(title=fb["title"], summary=fb["summary"], description=fb["description"])  # type: ignore
        # If fallback disabled, rethrow with details
        raise HTTPException(status_code=500, detail={"error": "workflow failure", "attempts": attempts})

    # Best-effort normalization of output fields
    out: Dict[str, Any] = result.get("output", result)
    title = str(out.get("updated_title") or out.get("title") or input_obj["project_name"])[:200]
    summary = str(out.get("updated_summary") or out.get("summary") or input_obj["summary"])[:500]
    description = str(
        out.get("updated_description") or out.get("description") or input_obj["existing_description"]
    )

    return AiGenerateResponse(title=title, summary=summary, description=description)


@router.get("/ai/diagnose")
async def diagnose_ai_integration():
    """Diagnose connectivity to OpenAI Workflows and show response details.
    Does not include secrets. Intended for dev troubleshooting only.
    """
    cfg = _get_openai_config()
    payload = {"input": {"project_name": "diag", "summary": "", "clients": [], "existing_description": "", "prompt": ""}}
    url_primary = f"{cfg['base_url']}/v1/workflows/{cfg['workflow_id']}/runs"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {cfg['api_key']}",
        "OpenAI-Beta": "workflows=v1",
    }
    if cfg.get("project"):
        headers["OpenAI-Project"] = cfg["project"]
    safe_headers = {k: ("<redacted>" if k.lower() == "authorization" else v) for k, v in headers.items()}
    attempts: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        r1 = await client.post(url_primary, headers=headers, json=payload)
        attempts.append({"url": url_primary, "status": r1.status_code, "body": r1.text})
        if r1.status_code != 200:
            alt_url = f"{cfg['base_url']}/v1/workflows/runs"
            alt_body = {"workflow_id": cfg["workflow_id"], **payload}
            r2 = await client.post(alt_url, headers=headers, json=alt_body)
            attempts.append({"url": alt_url, "status": r2.status_code, "body": r2.text})
    return {"base_url": cfg["base_url"], "workflow_id": cfg["workflow_id"], "headers": safe_headers, "attempts": attempts}
