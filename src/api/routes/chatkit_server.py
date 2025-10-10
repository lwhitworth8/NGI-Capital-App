"""
NGI Capital ChatKit Server Implementation

Self-hosted ChatKit server with database tools and UI control capabilities
for Finance and Employees modules.
"""

import os
import json
import sqlite3
import asyncio
from typing import AsyncIterator, Any, Dict, List, Optional
from datetime import datetime
from sqlalchemy import text

from chatkit.server import ChatKitServer, ThreadStreamEvent, StreamingResult, UserMessageItem, ThreadMetadata, ThreadItem, Store, agents


class NGIChatKitStore(Store):
    """SQLite-based store for ChatKit threads and messages"""
    
    def __init__(self, db_path: str = "chatkit_threads.db"):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize SQLite database with required tables"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS threads (
                id TEXT PRIMARY KEY,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
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
    
    def generate_item_id(self, item_type: str, thread: ThreadMetadata, context: Any) -> str:
        """Generate unique item ID"""
        import uuid
        return f"{item_type}_{uuid.uuid4().hex[:16]}"
    
    async def load_thread(self, thread_id: str, context: Any) -> ThreadMetadata:
        """Load thread metadata"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT metadata FROM threads WHERE id = ?", (thread_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise ValueError(f"Thread {thread_id} not found")
        
        metadata = json.loads(row[0]) if row[0] else {}
        return ThreadMetadata(
            id=thread_id,
            metadata=metadata,
            created_at=datetime.now()
        )
    
    async def save_thread(self, thread: ThreadMetadata, context: Any) -> None:
        """Save thread metadata"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO threads (id, metadata, created_at)
            VALUES (?, ?, ?)
        """, (thread.id, json.dumps(thread.metadata), thread.created_at))
        conn.commit()
        conn.close()
    
    async def load_thread_items(self, thread_id: str, after: Optional[str], limit: int, order: str, context: Any) -> List[ThreadItem]:
        """Load thread items with pagination"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = "SELECT id, role, content, created_at FROM messages WHERE thread_id = ?"
        params = [thread_id]
        
        if after:
            query += " AND id > ?"
            params.append(after)
        
        query += f" ORDER BY created_at {order} LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        items = []
        for row in rows:
            items.append(ThreadItem(
                id=row[0],
                thread_id=thread_id,
                role=row[1],
                content=row[2],
                created_at=datetime.fromisoformat(row[3])
            ))
        
        return items
    
    async def add_thread_item(self, thread_id: str, item: ThreadItem, context: Any) -> None:
        """Add item to thread"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO messages (id, thread_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (item.id, thread_id, item.role, item.content, item.created_at.isoformat()))
        conn.commit()
        conn.close()
    
    async def save_item(self, thread_id: str, item: ThreadItem, context: Any) -> None:
        """Save thread item"""
        await self.add_thread_item(thread_id, item, context)
    
    async def load_item(self, thread_id: str, item_id: str, context: Any) -> ThreadItem:
        """Load specific thread item"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, role, content, created_at FROM messages 
            WHERE id = ? AND thread_id = ?
        """, (item_id, thread_id))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise ValueError(f"Item {item_id} not found")
        
        return ThreadItem(
            id=row[0],
            thread_id=thread_id,
            role=row[1],
            content=row[2],
            created_at=datetime.fromisoformat(row[3])
        )
    
    async def load_threads(self, limit: int, after: Optional[str], order: str, context: Any) -> List[ThreadMetadata]:
        """Load threads with pagination"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = "SELECT id, metadata, created_at FROM threads"
        params = []
        
        if after:
            query += " WHERE id > ?"
            params.append(after)
        
        query += f" ORDER BY created_at {order} LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        threads = []
        for row in rows:
            metadata = json.loads(row[1]) if row[1] else {}
            threads.append(ThreadMetadata(
                id=row[0],
                metadata=metadata,
                created_at=datetime.fromisoformat(row[2])
            ))
        
        return threads
    
    async def delete_thread(self, thread_id: str, context: Any) -> None:
        """Delete thread and all its messages"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE thread_id = ?", (thread_id,))
        cursor.execute("DELETE FROM threads WHERE id = ?", (thread_id,))
        conn.commit()
        conn.close()
    
    async def save_attachment(self, attachment: Any, context: Any) -> None:
        """Save attachment metadata"""
        pass  # Not implemented for this version
    
    async def load_attachment(self, attachment_id: str, context: Any) -> Any:
        """Load attachment"""
        raise NotImplementedError("Attachments not implemented")
    
    async def delete_attachment(self, attachment_id: str, context: Any) -> None:
        """Delete attachment"""
        pass  # Not implemented for this version


# Database Query Tools
@agents.function_tool(description="Get entity details, status, and key metrics")
async def get_entity_data(ctx: agents.RunContextWrapper[agents.AgentContext], entity_id: int) -> Dict[str, Any]:
    """Fetch entity information from database"""
    db = ctx.context['db_session']
    result = db.execute(text("""
        SELECT id, legal_name, entity_type, status, formation_date, ein, state
        FROM entities WHERE id = :eid
    """), {"eid": entity_id})
    row = result.fetchone()
    if not row:
        return {"error": "Entity not found"}
    return {
        "id": row[0],
        "name": row[1],
        "type": row[2],
        "status": row[3],
        "formation_date": row[4],
        "ein": row[5],
        "state": row[6]
    }


@function_tool(description="Get financial metrics and KPIs for an entity")
async def get_financial_metrics(ctx: RunContextWrapper[AgentContext], entity_id: int, date_range: str = "ytd") -> Dict[str, Any]:
    """Fetch revenue, expenses, cash flow, margins"""
    db = ctx.context['db_session']
    
    # Calculate date range
    if date_range == "ytd":
        date_filter = "date >= date('now', 'start of year')"
    elif date_range == "last_30_days":
        date_filter = "date >= date('now', '-30 days')"
    elif date_range == "last_90_days":
        date_filter = "date >= date('now', '-90 days')"
    else:
        date_filter = "1=1"
    
    # Get revenue
    revenue_result = db.execute(text(f"""
        SELECT COALESCE(SUM(amount), 0) as total_revenue
        FROM transactions 
        WHERE entity_id = :eid AND amount > 0 AND {date_filter}
    """), {"eid": entity_id})
    revenue = revenue_result.fetchone()[0] or 0
    
    # Get expenses
    expense_result = db.execute(text(f"""
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM transactions 
        WHERE entity_id = :eid AND amount < 0 AND {date_filter}
    """), {"eid": entity_id})
    expenses = abs(expense_result.fetchone()[0] or 0)
    
    # Get cash balance
    cash_result = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0) as cash_balance
        FROM transactions 
        WHERE entity_id = :eid
    """), {"eid": entity_id})
    cash_balance = cash_result.fetchone()[0] or 0
    
    net_income = revenue - expenses
    margin = (net_income / revenue * 100) if revenue > 0 else 0
    
    return {
        "revenue": revenue,
        "expenses": expenses,
        "net_income": net_income,
        "cash_balance": cash_balance,
        "margin_percent": round(margin, 2),
        "date_range": date_range
    }


@function_tool(description="Get recent transactions for an entity")
async def get_recent_transactions(ctx: RunContextWrapper[AgentContext], entity_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    """Fetch most recent financial transactions"""
    db = ctx.context['db_session']
    result = db.execute(text("""
        SELECT id, date, description, amount, category, account_id
        FROM transactions
        WHERE entity_id = :eid
        ORDER BY date DESC LIMIT :lim
    """), {"eid": entity_id, "lim": limit})
    
    transactions = []
    for row in result:
        transactions.append({
            "id": row[0],
            "date": row[1],
            "description": row[2],
            "amount": row[3],
            "category": row[4],
            "account_id": row[5]
        })
    
    return transactions


@function_tool(description="Get forecast scenarios for planning")
async def get_forecast_scenarios(ctx: RunContextWrapper[AgentContext], entity_id: int) -> List[Dict[str, Any]]:
    """Fetch all forecast scenarios from finance module"""
    db = ctx.context['db_session']
    result = db.execute(text("""
        SELECT id, name, stage, created_at
        FROM forecast_scenarios
        WHERE entity_id = :eid
        ORDER BY created_at DESC
    """), {"eid": entity_id})
    
    scenarios = []
    for row in result:
        scenarios.append({
            "id": row[0],
            "name": row[1],
            "stage": row[2],
            "created_at": row[3]
        })
    
    return scenarios


@function_tool(description="Get employees list for entity")
async def get_employees_list(ctx: RunContextWrapper[AgentContext], entity_id: int, status: str = "active") -> List[Dict[str, Any]]:
    """Fetch employee roster"""
    db = ctx.context['db_session']
    result = db.execute(text("""
        SELECT id, name, email, title, role, classification, start_date
        FROM employees
        WHERE entity_id = :eid AND status = :st
        ORDER BY name
    """), {"eid": entity_id, "st": status})
    
    employees = []
    for row in result:
        employees.append({
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "title": row[3],
            "role": row[4],
            "classification": row[5],
            "start_date": row[6]
        })
    
    return employees


@function_tool(description="Get teams and their members")
async def get_teams_list(ctx: RunContextWrapper[AgentContext], entity_id: int) -> List[Dict[str, Any]]:
    """Fetch teams with member counts"""
    db = ctx.context['db_session']
    result = db.execute(text("""
        SELECT t.id, t.name, t.description, COUNT(tm.employee_id) as member_count
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE t.entity_id = :eid
        GROUP BY t.id, t.name, t.description
        ORDER BY t.name
    """), {"eid": entity_id})
    
    teams = []
    for row in result:
        teams.append({
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "member_count": row[3]
        })
    
    return teams


@function_tool(description="Get timesheets for approval or review")
async def get_timesheets_list(ctx: RunContextWrapper[AgentContext], entity_id: int, status: str = "all") -> List[Dict[str, Any]]:
    """Fetch timesheets by status (draft/submitted/approved)"""
    db = ctx.context['db_session']
    
    if status == "all":
        where_clause = "t.entity_id = :eid"
        params = {"eid": entity_id}
    else:
        where_clause = "t.entity_id = :eid AND t.status = :status"
        params = {"eid": entity_id, "status": status}
    
    result = db.execute(text(f"""
        SELECT t.id, e.name as employee_name, t.pay_period_start, 
               t.pay_period_end, t.total_hours, t.status, t.submitted_date
        FROM timesheets t
        JOIN employees e ON t.employee_id = e.id
        WHERE {where_clause}
        ORDER BY t.pay_period_end DESC
    """), params)
    
    timesheets = []
    for row in result:
        timesheets.append({
            "id": row[0],
            "employee_name": row[1],
            "pay_period_start": row[2],
            "pay_period_end": row[3],
            "total_hours": row[4],
            "status": row[5],
            "submitted_date": row[6]
        })
    
    return timesheets


@function_tool(description="Get chart of accounts structure")
async def get_chart_of_accounts(ctx: RunContextWrapper[AgentContext], entity_id: int) -> List[Dict[str, Any]]:
    """Fetch COA for accounting queries"""
    db = ctx.context['db_session']
    result = db.execute(text("""
        SELECT account_number, account_name, account_type, balance
        FROM chart_of_accounts
        WHERE entity_id = :eid
        ORDER BY account_number
    """), {"eid": entity_id})
    
    accounts = []
    for row in result:
        accounts.append({
            "account_number": row[0],
            "account_name": row[1],
            "account_type": row[2],
            "balance": row[3]
        })
    
    return accounts


@function_tool(description="Get dashboard summary with key metrics")
async def get_dashboard_summary(ctx: RunContextWrapper[AgentContext], entity_id: int) -> Dict[str, Any]:
    """Quick overview of entity health"""
    db = ctx.context['db_session']
    
    # Get basic entity info
    entity_result = db.execute(text("""
        SELECT legal_name, entity_type, status
        FROM entities WHERE id = :eid
    """), {"eid": entity_id})
    entity_row = entity_result.fetchone()
    
    if not entity_row:
        return {"error": "Entity not found"}
    
    # Get employee count
    emp_result = db.execute(text("""
        SELECT COUNT(*) as emp_count FROM employees WHERE entity_id = :eid AND status = 'active'
    """), {"eid": entity_id})
    emp_count = emp_result.fetchone()[0] or 0
    
    # Get recent transaction count
    trans_result = db.execute(text("""
        SELECT COUNT(*) as trans_count FROM transactions 
        WHERE entity_id = :eid AND date >= date('now', '-30 days')
    """), {"eid": entity_id})
    trans_count = trans_result.fetchone()[0] or 0
    
    return {
        "entity_name": entity_row[0],
        "entity_type": entity_row[1],
        "status": entity_row[2],
        "active_employees": emp_count,
        "recent_transactions": trans_count
    }


@function_tool(description="Get recent accounting journal entries")
async def get_accounting_entries(ctx: RunContextWrapper[AgentContext], entity_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    """Fetch GL entries for accounting questions"""
    db = ctx.context['db_session']
    result = db.execute(text("""
        SELECT je.id, je.date, je.description, je.reference_number
        FROM journal_entries je
        WHERE je.entity_id = :eid
        ORDER BY je.date DESC, je.id DESC
        LIMIT :lim
    """), {"eid": entity_id, "lim": limit})
    
    entries = []
    for row in result:
        entries.append({
            "id": row[0],
            "date": row[1],
            "description": row[2],
            "reference_number": row[3]
        })
    
    return entries


# UI Control Tools (Client-side execution)
@function_tool(description="Create a new forecast scenario in Finance module")
async def create_forecast_scenario(ctx: RunContextWrapper[AgentContext], name: str, stage: str, assumptions: Optional[Dict] = None) -> None:
    """Creates forecast scenario via UI action"""
    ctx.context.client_tool_call = ClientToolCall(
        name="create_forecast_scenario",
        arguments={"name": name, "stage": stage, "assumptions": assumptions or {}}
    )


@function_tool(description="Add assumption to existing forecast scenario")
async def add_forecast_assumption(ctx: RunContextWrapper[AgentContext], scenario_id: int, category: str, value: float, notes: str = "") -> None:
    """Add financial assumption to scenario"""
    ctx.context.client_tool_call = ClientToolCall(
        name="add_forecast_assumption",
        arguments={"scenario_id": scenario_id, "category": category, "value": value, "notes": notes}
    )


@function_tool(description="Create a new employee in the system")
async def create_employee(ctx: RunContextWrapper[AgentContext], employee_data: Dict[str, Any]) -> None:
    """Opens employee creation form with pre-filled data"""
    ctx.context.client_tool_call = ClientToolCall(
        name="create_employee",
        arguments=employee_data
    )


@function_tool(description="Create a new team")
async def create_team(ctx: RunContextWrapper[AgentContext], name: str, description: str, lead_id: Optional[int] = None) -> None:
    """Creates team via UI"""
    ctx.context.client_tool_call = ClientToolCall(
        name="create_team",
        arguments={"name": name, "description": description, "lead_id": lead_id}
    )


@function_tool(description="Create timesheet for employee")
async def create_timesheet(ctx: RunContextWrapper[AgentContext], employee_id: int, pay_period_start: str, pay_period_end: str) -> None:
    """Opens timesheet creation form"""
    ctx.context.client_tool_call = ClientToolCall(
        name="create_timesheet",
        arguments={"employee_id": employee_id, "pay_period_start": pay_period_start, "pay_period_end": pay_period_end}
    )


@function_tool(description="Submit timesheet for approval")
async def submit_timesheet(ctx: RunContextWrapper[AgentContext], timesheet_id: int) -> None:
    """Submits draft timesheet"""
    ctx.context.client_tool_call = ClientToolCall(
        name="submit_timesheet",
        arguments={"timesheet_id": timesheet_id}
    )


@function_tool(description="Navigate user to specific module or page")
async def navigate_to_page(ctx: RunContextWrapper[AgentContext], path: str) -> None:
    """Navigate to: /finance, /employees, /accounting, /dashboard, /entities, etc."""
    ctx.context.client_tool_call = ClientToolCall(
        name="navigate_to_page",
        arguments={"path": path}
    )


@function_tool(description="Open a specific form modal in the UI")
async def open_form_modal(ctx: RunContextWrapper[AgentContext], modal_type: str, initial_data: Optional[Dict] = None) -> None:
    """Opens modal: employee_form, team_form, forecast_form, etc."""
    ctx.context.client_tool_call = ClientToolCall(
        name="open_form_modal",
        arguments={"modal_type": modal_type, "initial_data": initial_data or {}}
    )


@function_tool(description="Pre-fill form fields with suggested values")
async def pre_fill_form(ctx: RunContextWrapper[AgentContext], form_id: str, field_values: Dict[str, Any]) -> None:
    """Pre-populates form fields"""
    ctx.context.client_tool_call = ClientToolCall(
        name="pre_fill_form",
        arguments={"form_id": form_id, "field_values": field_values}
    )


@function_tool(description="Trigger business workflow or automation")
async def trigger_workflow(ctx: RunContextWrapper[AgentContext], workflow_name: str, params: Dict[str, Any]) -> None:
    """Execute workflows: export_data, generate_report, sync_data, etc."""
    ctx.context.client_tool_call = ClientToolCall(
        name="trigger_workflow",
        arguments={"workflow_name": workflow_name, "params": params}
    )


class NGIChatKitServer(ChatKitServer):
    """NGI Capital ChatKit Server with database tools and UI control capabilities"""
    
    def __init__(self, data_store: Store, db_session):
        super().__init__(data_store, file_store=None)
        self.db = db_session
        
        # GPT-5 Agent with all tools
        self.agent = Agent(
            model="gpt-5",  # or gpt-4.1 if gpt-5 not available
            name="NEX Assistant",
            instructions="""You are NEX, the AI assistant for NGI Capital's internal platform.

You have access to:
- Complete NGI Capital database (entities, finances, employees, transactions, investors)
- UI control capabilities in Finance and Employees modules
- Web search for current information and accounting questions

You can:
1. Answer questions about data in the system
2. Help users create forecasts, add employees, manage timesheets
3. Guide users through workflows
4. Pre-fill forms and open relevant UI modals
5. Navigate users to specific pages
6. Search the internet for accounting guidance and market data

Always be helpful, professional, and proactive in suggesting actions.
Remember: Projects are managed in NGI Advisory module only - do not create projects in Employees module.""",
            tools=[
                # Database Query Tools
                get_entity_data,
                get_financial_metrics,
                get_recent_transactions,
                get_forecast_scenarios,
                get_employees_list,
                get_teams_list,
                get_timesheets_list,
                get_chart_of_accounts,
                get_dashboard_summary,
                get_accounting_entries,
                # UI Action Tools (Client-executed)
                create_forecast_scenario,
                add_forecast_assumption,
                create_employee,
                create_team,
                create_timesheet,
                submit_timesheet,
                navigate_to_page,
                open_form_modal,
                pre_fill_form,
                trigger_workflow,
            ]
        )
    
    async def respond(
        self,
        thread: ThreadMetadata,
        input: UserMessageItem | None,
        context: Any,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Handle incoming messages and stream responses"""
        agent_context = AgentContext(
            thread=thread,
            store=self.store,
            request_context=context,
            db_session=self.db
        )
        
        result = Runner.run_streamed(
            self.agent,
            await simple_to_agent_input(input) if input else [],
            context=agent_context,
        )
        
        async for event in stream_agent_response(agent_context, result):
            yield event
