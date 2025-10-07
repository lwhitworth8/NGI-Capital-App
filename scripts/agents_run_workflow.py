"""
Helper script to trigger the NGI Software Manager workflow via OpenAI API.

Usage:
  pip install openai>=1.51.0
  OPENAI_API_KEY=... OPENAI_WORKFLOW_SOFTWARE_MANAGER_ID=... python scripts/agents_run_workflow.py --task "Describe the change"

Note: This is a reference for local validation. In production, expose a FastAPI route that wraps this logic.
"""

import argparse
import json
import os
import sys

try:
    from openai import OpenAI  # type: ignore
except Exception:
    print("Missing dependency: pip install openai>=1.51.0", file=sys.stderr)
    sys.exit(2)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", required=True, help="High-level task for the Software Manager")
    parser.add_argument("--context", default="{}", help="Optional JSON context object")
    args = parser.parse_args()

    workflow_id = os.getenv("OPENAI_WORKFLOW_SOFTWARE_MANAGER_ID")
    if not workflow_id:
        print("OPENAI_WORKFLOW_SOFTWARE_MANAGER_ID is not set", file=sys.stderr)
        return 2

    try:
        context_obj = json.loads(args.context)
    except Exception:
        print("--context must be valid JSON", file=sys.stderr)
        return 2

    client = OpenAI(project=os.getenv("OPENAI_PROJECT"))

    # Workflows API: create a run with inputs
    run = client.workflows.runs.create(
        workflow_id=workflow_id,
        inputs={
            "task": args.task,
            "context": context_obj,
        },
    )

    print(f"Run created: {run.id}")

    # Poll for completion; for production prefer server-side streaming/events
    while True:
        status = client.workflows.runs.retrieve(run_id=run.id)
        print(f"status={status.status}")
        if status.status in ("succeeded", "failed", "cancelled"):
            break
        import time
        time.sleep(1.0)

    # Fetch the final output
    try:
        out = client.workflows.runs.get_output(run_id=run.id)
        print("\n=== OUTPUT ===\n")
        print(json.dumps(out, indent=2))
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

