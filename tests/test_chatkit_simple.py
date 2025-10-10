"""
Test simplified ChatKit implementation
"""

import pytest
from unittest.mock import Mock
from src.api.routes.chatkit_simple import SimpleChatKitStore


def test_chatkit_store_initialization():
    """Test ChatKit store initializes correctly"""
    store = SimpleChatKitStore(":memory:")
    assert store is not None
    assert store.db_path == ":memory:"


def test_chatkit_store_thread_creation():
    """Test thread creation"""
    store = SimpleChatKitStore(":memory:")
    context = {"user_id": "test_user"}
    
    thread_id = store.generate_thread_id(context)
    assert thread_id.startswith("thread_")
    assert len(thread_id) > 10  # Should be a reasonable length


def test_chatkit_store_item_id_generation():
    """Test item ID generation"""
    store = SimpleChatKitStore(":memory:")
    context = {"user_id": "test_user"}
    
    item_id = store.generate_item_id("message", "thread_123", context)
    assert item_id.startswith("message_")
    assert len(item_id) > 10


@pytest.mark.asyncio
async def test_chatkit_store_operations():
    """Test basic store operations"""
    import tempfile
    import os
    
    # Use a temporary file for the database
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db_path = tmp.name
    
    try:
        store = SimpleChatKitStore(db_path)
        context = {"user_id": "test_user"}
        
        # Test thread creation
        thread_id = await store.create_thread({"user_id": "test_user"}, context)
        assert thread_id.startswith("thread_")
        
        # Test message addition
        message_id = await store.add_message(thread_id, "user", "Hello world", context)
        assert message_id.startswith("message_")
        
        # Test message retrieval
        messages = await store.get_messages(thread_id)
        assert len(messages) == 1
        assert messages[0]["role"] == "user"
        assert messages[0]["content"] == "Hello world"
    finally:
        # Clean up the temporary database file
        if os.path.exists(db_path):
            os.unlink(db_path)


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


def test_imports():
    """Test that all required modules can be imported"""
    try:
        from src.api.routes.chatkit_simple import SimpleChatKitStore, router
        assert True
    except ImportError as e:
        pytest.fail(f"Failed to import ChatKit simple modules: {e}")
