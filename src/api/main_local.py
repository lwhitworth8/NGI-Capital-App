#!/usr/bin/env python
"""
Local development startup script for NGI Capital API
This script properly sets up the Python path for local development
"""
import sys
import os

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, project_root)

# Now import and run the main app
from src.api.main import app
import uvicorn

if __name__ == "__main__":
    print("Starting NGI Capital API Server (Local Development Mode)")
    print(f"Project root: {project_root}")
    print(f"Python path: {sys.path}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info",
        access_log=True
    )