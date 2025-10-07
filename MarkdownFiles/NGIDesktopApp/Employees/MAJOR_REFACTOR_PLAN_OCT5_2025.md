# EMPLOYEE MODULE MAJOR REFACTOR PLAN
**Date:** October 5, 2025  
**Status:** Planning Complete - Ready to Build

---

## 🎯 REQUIREMENTS

### 1. Multi-Entity Employee Management
- Each entity can have its own employees
- Cross-entity employee sharing (optional)
- Entity-specific org structure

### 2. NGI Capital Advisory LLC Special Handling
- **PROJECTS instead of TEAMS**
- Structure: Project → Project Leads → Student Employees
- **Auto-create employees from students** when onboarded to projects
- Link to student records in NGI Advisory system

### 3. Timesheet Control Center
- **Employee View:** Submit timesheets with hours per day/project
- **Manager View:** Approve/reject timesheets with comments
- **Finance View:** Export approved timesheets to payroll
- Integration with Payroll module

### 4. Entities UI Enhancement
- Show team count and employee count per entity
- Entity detail view shows org structure
- Visual org chart

---

## 📊 DATABASE SCHEMA (Already Exists)

### Current Tables:
- ✅ `teams` - Team structure
- ✅ `projects` - Projects for Advisory
- ✅ `employees` - Employee master
- ✅ `employee_projects` - Employee-project links
- ✅ `team_memberships` - Team memberships with allocation
- ✅ `employee_tasks` - To-do items
- ✅ `employee_entity_memberships` - Multi-entity support

### New Tables Needed:
```sql
CREATE TABLE timesheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    total_hours DECIMAL(10,2),
    status TEXT DEFAULT 'draft',  -- draft, submitted, approved, rejected, paid
    submitted_date DATETIME,
    approved_by_id INTEGER,
    approved_date DATETIME,
    rejected_by_id INTEGER,
    rejected_date DATETIME,
    rejection_reason TEXT,
    paid_date DATE,
    payroll_run_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE timesheet_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timesheet_id INTEGER NOT NULL,
    entry_date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    project_id INTEGER,  -- For Advisory
    team_id INTEGER,     -- For other entities
    notes TEXT,
    FOREIGN KEY (timesheet_id) REFERENCES timesheets(id)
);

CREATE TABLE project_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    role TEXT,  -- 'lead', 'co-lead'
    UNIQUE(project_id, employee_id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE student_employee_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,  -- Links to NGI Advisory student system
    onboarding_date DATE,
    UNIQUE(employee_id, student_id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

---

## 🎨 UI DESIGN (Modern 2025)

### Main Tabs (Employees Module):
1. **Dashboard** - KPIs, quick actions
2. **Employees** - Employee list with filters
3. **Teams/Projects** - Org structure (tabs for regular entities vs Advisory)
4. **Timesheets** - Submission and approval hub
5. **Reports** - Headcount, turnover, payroll summary

### Timesheet Workflow:
```
Employee View:
[Create Timesheet] → Select Pay Period → Enter Hours by Day → [Submit]

Manager View:
[Pending Approvals (5)] → Review Timesheet → Check Hours → [Approve / Reject with Comment]

Finance View:
[Approved Timesheets Ready for Payroll (12)] → [Export to Payroll] → Mark as Paid
```

### Advisory-Specific UI:
```
Projects Tab (instead of Teams):
- Project List
- For each project:
  - Project Leads (with role badges)
  - Student Employees (with student profile link)
  - Hours logged per student
  - Project timeline
```

---

## 🔧 BACKEND ENHANCEMENTS NEEDED

### New API Endpoints:

#### Timesheets:
- `POST /api/timesheets` - Create new timesheet
- `GET /api/timesheets` - List timesheets (with filters: employee, status, pay period)
- `GET /api/timesheets/{id}` - Get timesheet detail
- `PUT /api/timesheets/{id}` - Update timesheet (draft only)
- `POST /api/timesheets/{id}/submit` - Submit for approval
- `POST /api/timesheets/{id}/approve` - Approve timesheet
- `POST /api/timesheets/{id}/reject` - Reject timesheet with reason
- `POST /api/timesheets/{id}/entries` - Add/update entries
- `GET /api/timesheets/pending-approval` - Get pending approvals for manager
- `GET /api/timesheets/export-to-payroll` - Export approved timesheets

#### Projects (Advisory):
- `POST /api/projects/{id}/leads` - Add project lead
- `DELETE /api/projects/{id}/leads/{employee_id}` - Remove lead
- `POST /api/employees/create-from-student` - Auto-create employee from student onboarding

#### Entities Integration:
- `GET /api/entities/{id}/org-structure` - Get team/project count, employee count
- `GET /api/entities/{id}/org-chart` - Get visual org chart data

---

## 📱 MOBILE-FIRST TIMESHEET UI

### Employee Timesheet Submission (Mobile-Friendly):
```
[Week of Oct 1 - Oct 7, 2025]

Mon 10/1: [8.0] hours  Project: [Website Redesign ▼]
Tue 10/2: [7.5] hours  Project: [Website Redesign ▼]
Wed 10/3: [8.0] hours  Project: [Marketing Campaign ▼]
Thu 10/4: [6.0] hours  Project: [Website Redesign ▼]
Fri 10/5: [8.0] hours  Project: [Website Redesign ▼]
Sat 10/6: [0.0] hours
Sun 10/7: [0.0] hours

Total: 37.5 hours

[Save Draft]  [Submit for Approval]
```

### Manager Approval Interface:
```
Pending Timesheets (5):

[Expand] John Doe - Week of Oct 1-7 (37.5 hours)
  Mon: 8.0h (Website Redesign)
  Tue: 7.5h (Website Redesign)
  Wed: 8.0h (Marketing Campaign)
  ...
  
  Policy Checks:
  ✓ No days over 12 hours
  ✓ Total under 40 hours (regular)
  ⚠ Tue: 7.5h (unusual for this employee)
  
  [Approve] [Reject] [Request Changes]
```

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Backend - Timesheet System (3-4 hours)
1. Create timesheet tables in `employees.py`
2. Build all timesheet API endpoints
3. Add validation (max hours, policy checks)
4. Integration with payroll JE creation

### Phase 2: Backend - Advisory Auto-Creation (1-2 hours)
1. Create `student_employee_links` table
2. Build student onboarding webhook
3. Auto-create employee when student joins project
4. Link project leads functionality

### Phase 3: Frontend - Employee Module UI (4-5 hours)
1. Refactor `employees/page.tsx` with modern tabbed design
2. Build timesheet submission UI
3. Build timesheet approval UI
4. Build Advisory projects UI (vs teams)
5. Add animations and modern design

### Phase 4: Frontend - Entities Integration (1-2 hours)
1. Update entities UI to show employee/team counts
2. Add org structure view
3. Visual org chart component

### Phase 5: Testing (3-4 hours)
1. Create comprehensive test suite
2. Test multi-entity scenarios
3. Test Advisory auto-creation
4. Test timesheet workflows
5. Test payroll integration

---

## 📋 SUCCESS CRITERIA

By the end:
- [ ] Multi-entity employee management works
- [ ] Advisory auto-creates employees from students
- [ ] Timesheets can be submitted and approved
- [ ] Approved timesheets integrate with payroll
- [ ] Entities UI shows team/employee counts
- [ ] All tests passing (100%)
- [ ] Modern, animated UI
- [ ] Zero bugs or errors

---

## ⏱️ ESTIMATED TIMELINE

- Backend: 4-6 hours
- Frontend: 5-7 hours
- Testing: 3-4 hours
- Bug fixes: 2-3 hours
- **Total: 14-20 hours**

---

**Ready to start building?** This is the final major piece before everything is connected! 🚀





