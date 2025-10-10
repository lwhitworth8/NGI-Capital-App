import os
import pytest
from httpx import ASGITransport, AsyncClient

from src.api.main import app


@pytest.mark.asyncio
async def test_ai_generate_missing_config(monkeypatch):
    # Ensure missing envs
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("NGI_AGENT_WORKFLOW_ID", raising=False)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/projects/ai/generate",
            json={
                "projectName": "Test",
                "summary": "Sum",
                "clients": ["ACME"],
                "existingDescription": "Desc",
                "prompt": "Be concise",
            },
        )
        assert resp.status_code == 503
        data = resp.json()
        assert data["detail"] == "OpenAI API key or workflow ID not configured"


@pytest.mark.asyncio
async def test_ai_generate_success(monkeypatch):
    # Set envs
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("NGI_AGENT_WORKFLOW_ID", "wf_123")

    # Mock http call
    import src.api.routes.project_ai as mod

    async def _fake_run(cfg, payload):
        assert payload["input"]["project_name"] == "Draft"
        return {
            "output": {
                "updated_title": "AI Title",
                "updated_summary": "AI Summary",
                "updated_description": "AI Description",
            }
        }

    monkeypatch.setattr(mod, "_run_openai_workflow", _fake_run)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/projects/ai/generate",
            json={
                "projectName": "Draft",
                "summary": "Partial",
                "clients": ["ACME"],
                "existingDescription": "Existing",
                "prompt": "tone: formal",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "AI Title"
        assert data["summary"] == "AI Summary"
        assert data["description"] == "AI Description"


@pytest.mark.asyncio
async def test_ai_generate_upstream_error(monkeypatch):
    # Set envs
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("NGI_AGENT_WORKFLOW_ID", "wf_123")

    import src.api.routes.project_ai as mod

    async def _fake_run_err(cfg, payload):
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Agent workflow error: bad")

    monkeypatch.setattr(mod, "_run_openai_workflow", _fake_run_err)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/projects/ai/generate",
            json={"projectName": "x", "summary": "y", "clients": [], "existingDescription": "", "prompt": ""},
        )
        assert resp.status_code == 500
        data = resp.json()
        assert str(data["detail"]).startswith("Agent workflow error:")
