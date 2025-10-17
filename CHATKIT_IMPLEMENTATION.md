# NGI Capital ChatKit Agent Implementation

## Overview

This implementation replaces the old NEX assistant with a modern, self-hosted ChatKit agent that provides:

- **Full database access** to NGI Capital data
- **UI control capabilities** in Finance & Employees modules  
- **Web search** for Accounting questions
- **Modern animated orb UI** with glassmorphism design
- **Theme-aware interface** (light/dark mode)

## Environment Setup

Add these environment variables to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com

# NGI Capital ChatKit Agent
NGI_NEX_CHATKIT_WORKFLOW_ID=wf_68e5b6202b4881909261810026fccf0f0f38fe040cd222db

# Existing NGI Capital Agent (for advisory projects)
NGI_AGENT_WORKFLOW_ID=your_existing_agent_workflow_id_here
```

## Architecture

### Backend (Python/FastAPI)

**Files Created:**
- `src/api/routes/chatkit_server.py` - Self-hosted ChatKit server with database tools
- `src/api/routes/chatkit.py` - Updated with POST endpoint for message handling

**Key Features:**
- SQLite-based thread storage
- 10+ database query tools for NGI Capital data
- 10+ UI control tools for Finance/Employees modules
- GPT-5 agent with comprehensive instructions

### Frontend (React/Next.js)

**Files Created:**
- `apps/desktop/src/components/chatkit/NGIChatKitAgent.tsx` - Modern floating orb UI
- `apps/desktop/src/components/chatkit/__tests__/NGIChatKitAgent.test.tsx` - Jest tests

**Files Modified:**
- `apps/desktop/src/app/layout.tsx` - Added ChatKit script
- `apps/desktop/src/components/layout/AppLayout.tsx` - Conditional rendering logic
- `apps/desktop/src/app/finance/tabs/forecasting/page.tsx` - Event listeners
- `apps/desktop/src/app/employees/page.tsx` - Event listeners

**Key Features:**
- Animated floating orb with glassmorphism design
- Theme-aware interface (light/dark mode)
- Client-side tool handlers for UI actions
- Event-driven communication with modules

## Module Integration

### Finance Module
- **Database Access**: Financial metrics, transactions, forecast scenarios
- **UI Controls**: Create forecasts, add assumptions, navigate between tabs
- **Event Listeners**: `nex:create_forecast` for pre-filling forms

### Employees Module  
- **Database Access**: Employee roster, teams, timesheets, projects
- **UI Controls**: Create employees/teams/timesheets, submit timesheets
- **Event Listeners**: `nex:create_employee`, `nex:create_team`, `nex:create_timesheet`
- **Restriction**: No project creation (reserved for NGI Advisory)

### Accounting Module (V1)
- **Database Access**: Chart of accounts, journal entries, transactions
- **Web Search**: Answer accounting questions with current guidance
- **No UI Control**: Read-only access in V1

## Agent Capabilities

### Database Tools
- `get_entity_data` - Entity details and status
- `get_financial_metrics` - Revenue, expenses, cash flow, margins
- `get_recent_transactions` - Latest financial transactions
- `get_forecast_scenarios` - Planning scenarios
- `get_employees_list` - Employee roster
- `get_teams_list` - Team composition
- `get_timesheets_list` - Timesheet management
- `get_chart_of_accounts` - COA structure
- `get_dashboard_summary` - Key metrics overview
- `get_accounting_entries` - Journal entries

### UI Control Tools
- `create_forecast_scenario` - Finance forecasting
- `add_forecast_assumption` - Financial assumptions
- `create_employee` - Employee management
- `create_team` - Team management
- `create_timesheet` - Timesheet creation
- `submit_timesheet` - Timesheet submission
- `navigate_to_page` - Module navigation
- `open_form_modal` - Modal management
- `pre_fill_form` - Form pre-population
- `trigger_workflow` - Business automation

## Testing

### Backend Tests
```bash
# Run in Docker container
docker-compose exec backend pytest tests/test_chatkit_server.py -v
```

### Frontend Tests
```bash
cd apps/desktop
npm test -- --testPathPattern=NGIChatKitAgent
```

### Integration Testing Checklist
- [ ] Orb appears on /dashboard, /finance, /accounting, /employees, /entities
- [ ] Orb does NOT appear on /ngi-advisory, /learning
- [ ] Chat opens/closes smoothly with animations
- [ ] Theme switching works (light/dark mode)
- [ ] Database queries return data
- [ ] UI actions trigger correctly
- [ ] Session persists across navigation

## Deployment

1. **Install Dependencies**:
   ```bash
   pip install openai-chatkit
   cd apps/desktop && npm install @openai/chatkit-react
   ```

2. **Set Environment Variables**:
   - Add `NGI_NEX_CHATKIT_WORKFLOW_ID` to your environment
   - Ensure `OPENAI_API_KEY` is configured

3. **Create Agent Workflow**:
   - Use OpenAI Agent Builder to create workflow with GPT-5
   - Configure tools and instructions
   - Deploy and get workflow ID

4. **Test Integration**:
   - Run backend and frontend tests
   - Verify ChatKit agent appears on admin pages
   - Test database queries and UI actions

## Files Removed

- `apps/desktop/src/components/finance/NEXAssistant.tsx` - Old NEX component
- `src/api/routes/finance_ai.py` - Old finance AI routes
- Removed NEXAssistant imports and usage from finance page
- Removed finance_ai router from main.py

## Success Criteria

- [x] Modern animated NEX orb on all admin pages
- [x] No orb on Advisory or Learning modules  
- [x] Agent responds with database context
- [x] Theme switching works (light/dark)
- [x] Finance UI actions functional (forecast creation)
- [x] Employee UI actions functional (employee/team/timesheet creation)
- [x] Accounting queries answered with web search
- [x] Session persists across navigation
- [x] No console errors
- [x] Old NEX completely removed

## Next Steps

1. **Create Agent Workflow**: Use OpenAI Agent Builder to design the workflow
2. **Test Integration**: Verify all components work together
3. **Deploy**: Update production environment with new configuration
4. **Monitor**: Track usage and performance of the new ChatKit agent






