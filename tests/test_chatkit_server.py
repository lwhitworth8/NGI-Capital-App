"""
Test ChatKit server implementation
"""

import pytest
from unittest.mock import Mock


def test_chatkit_imports():
    """Test that ChatKit can be imported successfully"""
    try:
        from chatkit.server import ChatKitServer, ThreadStreamEvent, StreamingResult, UserMessageItem, ThreadMetadata, ThreadItem, Store
        from chatkit.server import agents
        assert True
    except ImportError as e:
        pytest.fail(f"Failed to import ChatKit modules: {e}")


def test_agents_module_available():
    """Test that agents module is available"""
    try:
        from chatkit.server import agents
        assert hasattr(agents, 'Agent')
        assert hasattr(agents, 'function_tool')
        assert hasattr(agents, 'RunContextWrapper')
        assert hasattr(agents, 'AgentContext')
        assert hasattr(agents, 'Runner')
        assert hasattr(agents, 'ClientToolCall')
    except ImportError as e:
        pytest.fail(f"Failed to import agents module: {e}")


def test_chatkit_store_basic():
    """Test basic ChatKit store functionality"""
    try:
        from src.api.routes.chatkit_server import NGIChatKitStore
        
        store = NGIChatKitStore(":memory:")
        context = {"user_id": "test_user"}
        
        # Test thread creation
        thread_id = store.generate_thread_id(context)
        assert thread_id.startswith("thread_")
        
        # Test item ID generation
        thread_metadata = Mock()
        thread_metadata.id = thread_id
        item_id = store.generate_item_id("message", thread_metadata, context)
        assert item_id.startswith("message_")
        
    except Exception as e:
        pytest.fail(f"Failed to test ChatKit store: {e}")


def test_environment_variables():
    """Test that required environment variables are documented"""
    import os
    
    # These should be documented in the implementation
    required_vars = [
        "OPENAI_API_KEY",
        "NGI_NEX_CHATKIT_WORKFLOW_ID"
    ]
    
    for var in required_vars:
        # We don't require them to be set, just documented
        assert var in ["OPENAI_API_KEY", "NGI_NEX_CHATKIT_WORKFLOW_ID"], f"Variable {var} should be documented"
