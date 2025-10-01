# MCP Servers Guide - NGI Capital App

This document explains each MCP server configured for the NGI Capital App and how to use them.

## Installed MCP Servers

### 1. 🔒 Snyk (Security Scanning)
**Purpose**: Continuously scan code for security vulnerabilities and license issues.

**Use Cases**:
- Scan Node.js dependencies: `snyk test --all-projects`
- Scan Python dependencies: `snyk test --file=requirements.txt`
- Code analysis: `snyk code test`
- Run before deployments and PRs

**Already configured in your workflow** - see `Setup_and_Workflow.md`

---

### 2. 📚 Context7 (Documentation Sync)
**Purpose**: Keep documentation in sync with code using AI-powered context.

**Use Cases**:
- Refresh PRDs after code changes
- Audit markdown docs against actual implementation
- Document new features automatically

**Example Prompts**:
- "Refresh the Projects PRD to match the current code in apps/desktop/src/app/ngi-advisory/projects/"
- "Compare Student Applications docs with actual implementation"

---

### 3. 📁 Filesystem (File Operations)
**Purpose**: Read, write, and manage files in your project.

**Use Cases**:
- Batch file operations
- Search across multiple markdown files
- Create/update documentation
- Manage uploads folder

**Example Prompts**:
- "List all PRD files in MarkdownFiles/NGIDesktopApp/"
- "Create a new module documentation structure"
- "Find all TODO comments in the codebase"

---

### 4. 🔄 Git (Version Control)
**Purpose**: Git operations, commit history, branch management.

**Use Cases**:
- Analyze commit history
- Create feature branches
- Review changes before committing
- Generate changelogs

**Example Prompts**:
- "Show recent commits related to Projects module"
- "Create a feature branch for Coffee Chats enhancement"
- "What changed in the last week?"

---

### 5. 🧠 Sequential Thinking (Complex Problem Solving)
**Purpose**: Break down complex problems with structured reasoning.

**Use Cases**:
- Architectural decisions
- Feature planning across modules
- Debugging complex issues
- Database schema design

**Example Prompts**:
- "Design the flow for auto-creating Onboarding instances when Application status changes to Offer Accepted"
- "Plan the integration between Coffee Chats and Google Calendar"

---

### 6. 💾 Memory (Persistent Context)
**Purpose**: Remember project-specific preferences and decisions across chat sessions.

**Use Cases**:
- Save architectural decisions
- Remember coding preferences
- Track ongoing feature work
- Store deployment configurations

**Example Prompts**:
- "Remember that we use Clerk for all authentication"
- "Save this FastAPI endpoint pattern for future reference"
- "What was our decision about file upload size limits?"

---

### 7. 🌐 Fetch (API Testing)
**Purpose**: Test HTTP endpoints and external APIs.

**Use Cases**:
- Test FastAPI endpoints locally
- Verify Slack webhook integration
- Test Google Calendar API calls
- Debug CORS issues

**Example Prompts**:
- "Test POST /api/advisory/projects endpoint"
- "Verify the health check endpoint at localhost:8001/api/health"
- "Test authentication with Clerk token"

---

## 🚀 Getting Started

### 1. Restart Cursor
After updating `mcp.json`, restart Cursor to load the new MCP servers.

### 2. Verify Installation
Check that all MCPs are available in Cursor's MCP panel.

### 3. Try It Out
**Quick Test**:
- Ask: "Using git MCP, show me the last 5 commits"
- Ask: "Using filesystem MCP, list all files in MarkdownFiles/NGIDesktopApp/"
- Ask: "Using sequential thinking, help me plan the Coffee Chats expiry job"

---

## 💡 Pro Tips

### Combine MCPs for Powerful Workflows
1. **Feature Development**: Sequential Thinking → Context7 → Git
   - Plan feature → Update docs → Commit with proper message

2. **Security Check**: Snyk → Git → Memory
   - Scan for vulnerabilities → Review changes → Remember fixes

3. **API Development**: Filesystem → Fetch → Context7
   - Read endpoint code → Test it → Update API docs

### For Your Specific Modules

**Projects Module**:
```
"Using sequential thinking, review the Projects PRD, then use filesystem to 
check the implementation in apps/desktop/src/app/ngi-advisory/projects/page.tsx, 
then use context7 to update the documentation"
```

**Student Applications**:
```
"Use git to show changes in student application code, then use fetch to test 
the /api/advisory/applications endpoint, then update docs with context7"
```

**Coffee Chats Integration**:
```
"Using sequential thinking, design the Google Calendar integration for Coffee Chats, 
then use memory to save the approach for future reference"
```

---

## 🔧 Optional MCPs to Add Later

If you find you need them:

### PostgreSQL MCP
For direct database queries (when you switch to PostgreSQL in production):
```json
"postgres": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/ngi_capital"]
}
```

### Brave Search MCP
For looking up documentation (requires API key from brave.com/search/api):
```json
"brave-search": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "YOUR_KEY"
  }
}
```

### Playwright MCP
For E2E test generation:
```json
"playwright": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-playwright"]
}
```

---

## 📞 Support

If an MCP isn't working:
1. Check that Node.js is installed: `node -v`
2. Restart Cursor
3. Check the MCP logs in Cursor's developer console
4. Verify the path in `mcp.json` is correct (Windows uses `\\` in paths)

For MCP-specific issues, visit: https://github.com/modelcontextprotocol

