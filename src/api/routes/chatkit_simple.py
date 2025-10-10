"""
Simplified ChatKit server implementation for NGI Capital

This is a basic implementation that provides the core functionality
without the complex agent SDK integration.
"""

import os
import json
import sqlite3
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy import text
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse, Response
from src.api.auth_deps import require_clerk_user

router = APIRouter(prefix="/api/chatkit", tags=["chatkit"])


class SimpleChatKitStore:
    """Simple SQLite-based store for ChatKit threads and messages"""
    
    def __init__(self, db_path: str = "chatkit_threads.db"):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize SQLite database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS threads (
                id TEXT PRIMARY KEY,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                thread_id TEXT,
                role TEXT,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(thread_id) REFERENCES threads(id)
            )
        """)
        conn.commit()
        conn.close()
    
    def generate_thread_id(self, context: Any) -> str:
        """Generate unique thread ID"""
        import uuid
        return f"thread_{uuid.uuid4().hex[:16]}"
    
    def generate_item_id(self, item_type: str, thread_id: str, context: Any) -> str:
        """Generate unique item ID"""
        import uuid
        return f"{item_type}_{uuid.uuid4().hex[:16]}"
    
    async def create_thread(self, metadata: Dict[str, Any], context: Any) -> str:
        """Create a new thread"""
        thread_id = self.generate_thread_id(context)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO threads (id, metadata, created_at)
            VALUES (?, ?, ?)
        """, (thread_id, json.dumps(metadata), datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return thread_id
    
    async def add_message(self, thread_id: str, role: str, content: str, context: Any) -> str:
        """Add a message to a thread"""
        message_id = self.generate_item_id("message", thread_id, context)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO messages (id, thread_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (message_id, thread_id, role, content, datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return message_id
    
    async def get_messages(self, thread_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get messages for a thread"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, role, content, created_at
            FROM messages
            WHERE thread_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        """, (thread_id, limit))
        
        messages = []
        for row in cursor.fetchall():
            messages.append({
                "id": row[0],
                "role": row[1],
                "content": row[2],
                "created_at": row[3]
            })
        
        conn.close()
        return messages


# Initialize store
store = SimpleChatKitStore()


@router.post("/session")
async def create_chatkit_session(
    payload: Dict[str, Any] = {},
    user=Depends(require_clerk_user)
) -> Dict[str, str]:
    """Create ChatKit session for self-hosted implementation"""
    # For self-hosted ChatKit, we don't need OpenAI's session API
    # We just return a dummy client_secret since we handle everything internally
    user_id = user.get("sub") or payload.get("user") or f"user_{os.urandom(6).hex()}"
    
    return {
        "client_secret": f"self-hosted-{user_id}",
        "user_id": user_id
    }


@router.post("")
async def chatkit_message_handler(
    request: Request
) -> Dict[str, Any]:
    """Handle incoming ChatKit messages"""
    try:
        body = await request.body()
        data = json.loads(body)
        
        # Extract message content
        message_content = data.get("message", "")
        thread_id = data.get("thread_id")
        entity_id = data.get("entity_id")
        
        # Use anonymous user for now
        user_id = "anonymous"
        
        print(f"Debug: message_content={message_content}, thread_id={thread_id}, entity_id={entity_id}")
        
        if not thread_id:
            # Create new thread
            thread_id = await store.create_thread(
                {"user_id": user_id, "entity_id": entity_id}, 
                {"user_id": user_id}
            )
        
        # Add user message
        await store.add_message(
            thread_id, 
            "user", 
            message_content, 
            {"user_id": user_id}
        )
        
        # Get response from OpenAI agent workflow
        response = await get_agent_response(message_content, entity_id, user_id)
        
        # Add assistant response
        await store.add_message(
            thread_id, 
            "assistant", 
            response, 
            {"user_id": user_id}
        )
        
        return {
            "thread_id": thread_id,
            "response": response,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_agent_response(message: str, entity_id: str, user_id: str) -> str:
    """Get response from OpenAI agent workflow using ChatKit API"""
    try:
        import httpx
        import json
        
        # Use the correct workflow ID
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        workflow_id = "wf_68e5b6202b4881909261810026fccf0f0f38fe040cd222db"  # Your correct workflow ID
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com").rstrip("/")
        project = os.getenv("OPENAI_PROJECT", "").strip()
        
        if not api_key:
            return "I'm sorry, but the AI agent is not properly configured. Please contact your administrator."
        
        # Build headers for ChatKit API
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "OpenAI-Beta": "chatkit=v1",
        }
        if project:
            headers["OpenAI-Project"] = project
        
        # Use ChatKit API instead of workflows API
        url = f"{base_url}/v1/chatkit/workflows/{workflow_id}/runs"
        print(f"Trying ChatKit API: {url}")
        
        # Prepare input payload for ChatKit
        payload = {
            "input": {
                "message": message,
                "entity_id": entity_id,
                "user_id": user_id,
                "context": "NGI Capital Internal System - ChatKit Assistant"
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            
            if resp.status_code != 200:
                print(f"ChatKit API failed: {resp.status_code} - {resp.text}")
                
                # Try alternative ChatKit endpoint
                alt_url = f"{base_url}/v1/chatkit/runs"
                alt_body = {"workflow_id": workflow_id, **payload}
                print(f"Trying alternative ChatKit endpoint: {alt_url}")
                
                alt_resp = await client.post(alt_url, headers=headers, json=alt_body)
                
                if alt_resp.status_code == 200:
                    resp = alt_resp
                else:
                    print(f"Alternative ChatKit endpoint also failed: {alt_resp.status_code} - {alt_resp.text}")
                    # Try workflows API as fallback
                    return await _try_workflows_api(api_key, base_url, workflow_id, message, entity_id, user_id)
            
            # Parse response
            try:
                result = resp.json()
            except Exception:
                return "I'm sorry, I received an invalid response from the AI agent. Please try again."
            
            # Extract the response from the ChatKit output
            output = result.get("output", result)
            if isinstance(output, dict):
                # Try different possible response fields
                response = (output.get("response") or 
                          output.get("message") or 
                          output.get("content") or 
                          output.get("text") or 
                          str(output))
            else:
                response = str(output)
            
            if response and response.strip():
                return response.strip()
            else:
                return "I received your message but couldn't generate a proper response. Please try rephrasing your question."
            
    except Exception as e:
        print(f"Error calling ChatKit API: {str(e)}")
        return "I'm sorry, I encountered an error while trying to get a response from the AI agent. Please try again later."


async def _try_workflows_api(api_key: str, base_url: str, workflow_id: str, message: str, entity_id: str, user_id: str) -> str:
    """Try workflows API as fallback"""
    try:
        import httpx
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "OpenAI-Beta": "workflows=v1",
        }
        
        payload = {
            "input": {
                "message": message,
                "entity_id": entity_id,
                "user_id": user_id,
                "context": "NGI Capital Internal System - ChatKit Assistant"
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Try primary workflows endpoint
            url = f"{base_url}/v1/workflows/{workflow_id}/runs"
            print(f"Trying workflows API: {url}")
            
            resp = await client.post(url, headers=headers, json=payload)
            
            if resp.status_code == 200:
                result = resp.json()
                output = result.get("output", result)
                if isinstance(output, dict):
                    response = (output.get("response") or 
                              output.get("message") or 
                              output.get("content") or 
                              output.get("text") or 
                              str(output))
                else:
                    response = str(output)
                
                if response and response.strip():
                    return response.strip()
            
            # If workflows API fails, use direct chat completion
            return await _fallback_via_chat(api_key, base_url, message, entity_id, user_id)
            
    except Exception as e:
        print(f"Error in workflows API fallback: {str(e)}")
        return await _fallback_via_chat(api_key, base_url, message, entity_id, user_id)


async def _fallback_via_chat(api_key: str, base_url: str, message: str, entity_id: str, user_id: str) -> str:
    """Fallback using Chat Completions with function calling for database access"""
    try:
        import httpx
        import json
        import sqlite3
        
        model = os.getenv("OPENAI_FALLBACK_MODEL", "gpt-4o").strip()
        url = f"{base_url}/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        
        # System prompt for NEX assistant with database access
        sys_prompt = """You are NEX, the AI assistant for NGI Capital's internal platform.

IMPORTANT: You MUST use the available tools to query the database before responding to any questions about data.

You have access to the complete NGI Capital database with the following key tables:
- entities: Company entities and their details
- accounting_documents: All documents in the document center
- journal_entries: Accounting journal entries
- chart_of_accounts: Chart of accounts structure
- employees: Employee information and details
- teams: Team structures and memberships
- projects: Project information
- timesheets: Employee timesheet data
- transactions: Financial transactions
- investors: Investor information
- advisory_projects: Advisory project details
- learning_companies: Learning company data
- And many more...

When users ask about:
- Documents in the document center → Use get_document_summary tool
- Entity information → Use get_entity_info tool
- Any other data → Use query_database tool

NEVER give generic responses. ALWAYS use the tools to get real data first.

Current context:
- Entity ID: {entity_id}
- User ID: {user_id}
- Module: NGI Capital Internal System

Example: If asked about documents, immediately call get_document_summary tool.""".format(entity_id=entity_id or "1", user_id=user_id or "anonymous")
        
        # Define database tools
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "query_database",
                    "description": "Query the NGI Capital database to get specific information",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "SQL query to execute on the database"
                            },
                            "description": {
                                "type": "string", 
                                "description": "Description of what this query is trying to find"
                            }
                        },
                        "required": ["query", "description"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_document_summary",
                    "description": "Get summary information about documents in the accounting module",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "entity_id": {
                                "type": "string",
                                "description": "Entity ID to filter documents for"
                            }
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_entity_info",
                    "description": "Get information about a specific entity",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "entity_id": {
                                "type": "string",
                                "description": "Entity ID to get information for"
                            }
                        },
                        "required": ["entity_id"]
                    }
                }
            }
        ]
        
        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": message},
            ],
            "tools": tools,
            "tool_choice": "auto",
            "temperature": 0.7,
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            print(f"Using fallback chat completion with tools: {url}")
            resp = await client.post(url, headers=headers, json=body)
            
            if resp.status_code != 200:
                print(f"Fallback chat completion failed: {resp.status_code} - {resp.text}")
                return "I'm sorry, I'm having trouble connecting to the AI agent right now. Please try again later."
            
            try:
                data = resp.json()
                message_response = data["choices"][0]["message"]
                
                print(f"Message response: {message_response}")
                
                # Check if the model wants to call a function
                if message_response.get("tool_calls"):
                    print(f"Tool calls detected: {message_response['tool_calls']}")
                    # Execute the function calls
                    tool_results = []
                    for tool_call in message_response["tool_calls"]:
                        function_name = tool_call["function"]["name"]
                        function_args = json.loads(tool_call["function"]["arguments"])
                        print(f"Executing function: {function_name} with args: {function_args}")
                        
                        if function_name == "query_database":
                            result = await _execute_database_query(function_args["query"])
                            tool_results.append({
                                "tool_call_id": tool_call["id"],
                                "role": "tool",
                                "name": function_name,
                                "content": result
                            })
                        elif function_name == "get_document_summary":
                            result = await _get_document_summary(entity_id)
                            tool_results.append({
                                "tool_call_id": tool_call["id"],
                                "role": "tool", 
                                "name": function_name,
                                "content": result
                            })
                        elif function_name == "get_entity_info":
                            result = await _get_entity_info(function_args["entity_id"])
                            tool_results.append({
                                "tool_call_id": tool_call["id"],
                                "role": "tool",
                                "name": function_name,
                                "content": result
                            })
                    
                    print(f"Tool results: {tool_results}")
                    
                    # Make a second call with the tool results
                    follow_up_messages = [
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": message},
                        message_response,
                        *tool_results
                    ]
                    
                    follow_up_body = {
                        "model": model,
                        "messages": follow_up_messages,
                        "temperature": 0.7,
                    }
                    
                    follow_up_resp = await client.post(url, headers=headers, json=follow_up_body)
                    if follow_up_resp.status_code == 200:
                        follow_up_data = follow_up_resp.json()
                        content = follow_up_data["choices"][0]["message"]["content"]
                        return content.strip()
                else:
                    print("No tool calls detected, using direct response")
                
                # If no tool calls, return the direct response
                content = message_response["content"]
                return content.strip()
                
            except Exception as e:
                print(f"Error parsing fallback response: {e}")
                return "I received your message but couldn't generate a proper response. Please try rephrasing your question."
                
    except Exception as e:
        print(f"Error in fallback chat completion: {str(e)}")
        return "I'm sorry, I encountered an error while trying to get a response from the AI agent. Please try again later."


async def _execute_database_query(query: str) -> str:
    """Execute a database query and return results"""
    try:
        import sqlite3
        
        conn = sqlite3.connect('/app/ngi_capital.db')
        cursor = conn.cursor()
        
        # Execute the query
        cursor.execute(query)
        results = cursor.fetchall()
        
        # Get column names
        columns = [description[0] for description in cursor.description] if cursor.description else []
        
        conn.close()
        
        # Format results
        if not results:
            return "No results found for this query."
        
        # Limit results to prevent overwhelming responses
        limited_results = results[:20]  # Show max 20 rows
        
        formatted_results = []
        for row in limited_results:
            row_dict = dict(zip(columns, row))
            formatted_results.append(row_dict)
        
        result_text = f"Query returned {len(results)} rows (showing first {len(limited_results)}):\n"
        result_text += json.dumps(formatted_results, indent=2, default=str)
        
        if len(results) > 20:
            result_text += f"\n... and {len(results) - 20} more rows"
        
        return result_text
        
    except Exception as e:
        return f"Database query error: {str(e)}"


async def _get_document_summary(entity_id: str) -> str:
    """Get summary of documents in the accounting module"""
    try:
        import sqlite3
        
        conn = sqlite3.connect('/app/ngi_capital.db')
        cursor = conn.cursor()
        
        # Use entity_id = 1 as default if not provided
        if not entity_id or entity_id == "None":
            entity_id = "1"
        
        # Get document counts by category for the specific entity
        query = """
        SELECT 
            category,
            COUNT(*) as count
        FROM accounting_documents 
        WHERE entity_id = ?
        GROUP BY category
        ORDER BY count DESC
        """
        
        cursor.execute(query, (entity_id,))
        results = cursor.fetchall()
        
        # Get total document count for this entity
        total_query = "SELECT COUNT(*) FROM accounting_documents WHERE entity_id = ?"
        cursor.execute(total_query, (entity_id,))
        total_count = cursor.fetchone()[0]
        
        conn.close()
        
        if not results:
            return f"No documents found for entity {entity_id}"
        
        summary = f"Document Center Summary for Entity {entity_id}:\n"
        summary += f"Total Documents: {total_count}\n\n"
        summary += "Documents by Category:\n"
        
        for category, count in results:
            # Format category names nicely
            formatted_category = category.replace('_', ' ').title()
            summary += f"- {formatted_category}: {count} documents\n"
        
        return summary
        
    except Exception as e:
        return f"Error getting document summary: {str(e)}"


async def _get_entity_info(entity_id: str) -> str:
    """Get information about a specific entity"""
    try:
        import sqlite3
        
        conn = sqlite3.connect('/app/ngi_capital.db')
        cursor = conn.cursor()
        
        # Get entity details
        query = "SELECT * FROM entities WHERE id = ?"
        cursor.execute(query, (entity_id,))
        entity = cursor.fetchone()
        
        if not entity:
            return f"Entity {entity_id} not found"
        
        # Get column names
        columns = [description[0] for description in cursor.description]
        entity_dict = dict(zip(columns, entity))
        
        conn.close()
        
        return f"Entity Information for {entity_id}:\n{json.dumps(entity_dict, indent=2, default=str)}"
        
    except Exception as e:
        return f"Error getting entity info: {str(e)}"


@router.get("/threads/{thread_id}/messages")
async def get_thread_messages(
    thread_id: str,
    user=Depends(require_clerk_user)
) -> List[Dict[str, Any]]:
    """Get messages for a thread"""
    messages = await store.get_messages(thread_id)
    return messages


@router.get("/diagnose")
async def chatkit_diagnose() -> Dict[str, Any]:
    """Diagnose ChatKit configuration"""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    workflow_id = (os.getenv("NGI_NEX_CHATKIT_WORKFLOW_ID") or os.getenv("NGI_AGENT_WORKFLOW_ID", "")).strip()
    base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com").rstrip("/")
    
    return {
        "api_key_configured": bool(api_key),
        "workflow_id_configured": bool(workflow_id),
        "base_url": base,
        "store_initialized": True
    }

@router.get("/test")
async def test_endpoint():
    """Test endpoint to debug store issues"""
    try:
        # Test store creation
        test_store = SimpleChatKitStore("/tmp/test_chatkit.db")
        print("Test store created successfully")
        
        # Test thread creation
        import asyncio
        thread_id = await test_store.create_thread({"user_id": "test"}, {"user_id": "test"})
        print(f"Test thread created: {thread_id}")
        
        return {"status": "ok", "thread_id": thread_id}
    except Exception as e:
        print(f"Test error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}
