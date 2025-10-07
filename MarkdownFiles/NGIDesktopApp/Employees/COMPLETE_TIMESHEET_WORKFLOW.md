# COMPLETE TIMESHEET WORKFLOW SYSTEM
**Date:** October 6, 2025  
**Status:** Full Specification

---

## 🎯 THREE USER TYPES, THREE WORKFLOWS

### 1. STUDENT EMPLOYEES (NGI Capital Advisory LLC)
**Location:** Student Portal App (apps/student)

#### Student Workflow:
1. Student gets onboarded to a project
2. System **auto-creates employee record** via `POST /api/employees/create-from-student`
3. Student sees "My Timesheets" in their student portal
4. **Weekly timesheet entry:**
   ```
   Project: Website Redesign
   Week: Oct 1-7, 2025
   
   Mon 10/1: [8.0] hours
   Tue 10/2: [7.5] hours
   Wed 10/3: [8.0] hours
   ...
   
   [Save Draft] [Submit to Project Lead]
   ```
5. Student submits → status = 'submitted'
6. Project lead approves → status = 'approved'
7. Finance exports to payroll → student gets paid

#### Backend Integration:
- Student portal calls: `POST /api/timesheets` with `employee_id` (auto-created)
- Project ID attached to each timesheet entry
- Project lead sees pending approvals in **Project Dashboard**

---

### 2. PROJECT LEADS (NGI Capital Advisory LLC)
**Location:** Admin App - Project Dashboard

#### Project Lead Workflow:
1. Navigate to **NGI Capital Advisory** in sidebar
2. Go to specific project (e.g., "Website Redesign")
3. See "Pending Timesheets" section:
   ```
   Student Timesheets Pending (3):
   
   [Expand] John Doe - Week of Oct 1-7 (37.5 hours)
     Mon: 8.0h | Tue: 7.5h | Wed: 8.0h | ...
     
     [Approve] [Reject]
   ```
4. Click Approve → status = 'approved'
5. Approved timesheets go to Finance for payroll

#### Backend Integration:
- Project dashboard fetches: `GET /api/timesheets/pending-approval?entity_id={advisory_llc_id}`
- Filter by project
- Approve: `POST /api/timesheets/{id}/approve`

---

### 3. EMPLOYEES (NGI Capital LLC - Landon & Andre)
**Location:** Admin App - Employees Module

#### Employee Workflow (Current Implementation):
1. Navigate to **Employees** in sidebar
2. Select entity: **NGI Capital LLC**
3. Go to **Timesheets** tab
4. Click "New Timesheet"
5. Select employee (Landon or Andre)
6. Select pay period
7. **Enter hours:**
   ```
   Week of Oct 1-7, 2025
   
   Mon 10/1: [8.0] hours
   Tue 10/2: [8.0] hours
   ...
   
   [Save Draft] [Submit for Approval]
   ```
8. Submit → other partner approves
9. **Approval Rule:** Andre approves Landon's timesheets, Landon approves Andre's
10. Approved → Finance exports to payroll

---

## 🔄 COMPLETE SYSTEM FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ STUDENT PORTAL (apps/student)                               │
├─────────────────────────────────────────────────────────────┤
│ 1. Student onboarded to project                             │
│ 2. Auto-create employee via API                             │
│ 3. Student submits timesheet                                │
│    → POST /api/timesheets (employee_id, project_id)         │
│    → POST /api/timesheets/{id}/entries                      │
│    → POST /api/timesheets/{id}/submit                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PROJECT DASHBOARD (Admin App)                               │
├─────────────────────────────────────────────────────────────┤
│ 1. Project lead sees pending timesheets                     │
│    → GET /api/timesheets/pending-approval                   │
│ 2. Reviews student hours                                    │
│ 3. Approves or rejects                                      │
│    → POST /api/timesheets/{id}/approve                      │
│    → POST /api/timesheets/{id}/reject                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ EMPLOYEES MODULE (Admin App)                                │
├─────────────────────────────────────────────────────────────┤
│ 1. Finance sees approved timesheets                         │
│    → GET /api/timesheets?status=approved                    │
│ 2. Exports to payroll                                       │
│ 3. Payroll processing creates JEs:                          │
│    Dr: Payroll Expense                                      │
│    Dr: Payroll Tax Expense                                  │
│    Cr: Cash                                                 │
│    Cr: Payroll Tax Liabilities                             │
│ 4. Marks timesheets as 'paid'                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 CURRENT STATUS (October 6, 2025)

### ✅ COMPLETE:
- Employee module UI (1,712 lines)
- Timesheet backend APIs (560 lines, 12 endpoints)
- Timesheet database tables (4 tables)
- Advisory auto-creation system
- Project lead management
- Approval workflow (submit → approve/reject)
- Admin can create timesheets for Landon & Andre
- Partners can approve each other's timesheets

### ⏳ TODO - NEXT SESSION:
1. **Student Portal Timesheet UI** (New feature in apps/student)
   - Add "My Timesheets" tab to student portal
   - Weekly hour entry form
   - Submit to project lead
   - View approval status

2. **Project Dashboard Timesheet Approval** (Enhancement)
   - Add "Pending Timesheets" section to project dashboard
   - Show all student timesheets for that project
   - One-click approve/reject per project lead

3. **Payroll JE Creation** (Backend enhancement)
   - When Finance clicks "Export to Payroll"
   - Auto-create journal entries for approved timesheets
   - Mark timesheets as 'paid'
   - Link to payroll run

4. **V2: Employee Portal** (Future - External Access)
   - Separate employee portal URL
   - Employees log in and submit their own timesheets
   - No admin access needed
   - Mobile-friendly for on-the-go time entry

---

## 🔐 SECURITY & ACCESS CONTROL

### Current (October 2025):
- **Admin Only:** Landon & Andre use Employee module to create/approve timesheets
- **Manual Entry:** Admins enter hours on behalf of employees
- **Dual Approval:** Andre approves Landon, Landon approves Andre

### V2 (Future):
- **Employee Self-Service:** Each employee logs in and enters their own hours
- **Manager Approval:** Managers see their team's pending timesheets
- **Finance Review:** Finance can export approved timesheets to payroll

### Student Portal (NGI Capital Advisory):
- **Student Access:** Students log in via student portal
- **Project-Based:** Students see only their assigned projects
- **Project Lead Approval:** Only project leads can approve
- **No Cross-Project Visibility:** Students can't see other projects' data

---

## 💼 ENTITY-SPECIFIC BEHAVIORS

### NGI Capital LLC (Regular Company):
- **Structure:** Teams (Executive, Board, Engineering, etc.)
- **Employees:** Landon Whitworth, Andre Nurmamade
- **Timesheets:** Admin-created, peer-approved
- **Hours:** Tracked by team
- **Payroll:** Standard W-2 employees

### NGI Capital Advisory LLC (Consulting/Advisory):
- **Structure:** PROJECTS (not teams)
- **Employees:** Auto-created from students
- **Timesheets:** Student-submitted, project lead-approved
- **Hours:** Tracked by project
- **Payroll:** Contractor payments (1099)
- **Special UI:** Projects view instead of teams view

---

## 📊 TIMESHEET STATUS WORKFLOW

```
DRAFT
  ↓ (Employee/Student clicks "Submit")
SUBMITTED
  ↓ (Manager/Lead clicks "Approve")    ↓ (Manager/Lead clicks "Reject")
APPROVED                              REJECTED
  ↓ (Finance exports to payroll)        ↓ (Employee resubmits)
PAID                                  DRAFT (cycle repeats)
```

---

## 🧪 TESTING SCENARIOS

### Test 1: Student Timesheet Flow
1. Onboard student "John Doe" to project "Website Redesign"
2. Verify employee auto-created
3. Student submits 40-hour timesheet
4. Project lead approves
5. Verify status = 'approved'
6. Finance exports to payroll
7. Verify JE created
8. Verify status = 'paid'

### Test 2: Partner Timesheet Flow (NGI Capital LLC)
1. Landon creates timesheet for self (40 hours)
2. Landon submits
3. Andre approves Landon's timesheet
4. Andre creates his own timesheet (38 hours)
5. Landon approves Andre's timesheet
6. Finance exports both to payroll
7. Verify JEs created for both

### Test 3: Rejection Flow
1. Student submits 80-hour timesheet (way too high)
2. Project lead rejects with reason: "Hours exceed reasonable amount"
3. Student sees rejection reason
4. Student edits to 40 hours
5. Student resubmits
6. Project lead approves

---

## 🚀 NEXT IMMEDIATE ACTIONS

### 1. Add Entity Selector (DONE ✅)
The Employee module now has entity selector at top right.

### 2. Test Current System
- Create employees for Landon & Andre
- Create sample timesheets
- Test approval workflow
- Verify data saves correctly

### 3. Build Student Portal Timesheets (Next Session)
**Location:** `apps/student/src/app/timesheets/page.tsx`
**Estimated:** 2-3 hours
**Features:**
- My timesheets list
- Create new timesheet
- Weekly entry form
- Submit to project lead
- View status

### 4. Enhance Project Dashboard (Next Session)
**Location:** `apps/desktop/src/app/ngi-advisory/projects/[id]/page.tsx`
**Estimated:** 1-2 hours
**Add Section:** "Pending Timesheets"
**Features:**
- List student timesheets for this project
- Quick approve/reject
- View details

### 5. Payroll JE Automation (Next Session)
**Location:** `src/api/routes/employees.py` or new `payroll.py`
**Estimated:** 2-3 hours
**Endpoint:** `POST /api/payroll/process-timesheets`
**Logic:**
- Get all approved timesheets
- Calculate gross pay (hours × rate)
- Calculate deductions (taxes, benefits)
- Create journal entries
- Mark timesheets as 'paid'

---

## 💡 V2 FEATURES (Future Roadmap)

### Employee Portal (External Access):
- Separate URL: `employees.ngicapital.com`
- Employee login (Clerk auth)
- Mobile app (React Native)
- GPS location verification
- Photo time clock
- PTO requests
- Pay stub download
- Benefits enrollment

### Advanced Timesheet Features:
- Overtime auto-calculation
- Time-off integration
- Billable vs non-billable hours
- Client billing integration
- Real-time notifications
- Mobile time entry
- Biometric authentication
- Geofencing (location verification)

---

## 📝 NOTES FOR IMPLEMENTATION

### Student Portal Timesheet UI:
```typescript
// apps/student/src/app/timesheets/page.tsx
// - Fetch employee_id from student_employee_links
// - Create timesheet with project_id from active project
// - Weekly calendar grid (reuse component from admin)
// - Submit workflow
```

### Project Dashboard Enhancement:
```typescript
// apps/desktop/src/app/ngi-advisory/projects/[id]/page.tsx
// - Add "Pending Timesheets" card
// - Fetch timesheets filtered by project_id
// - Show approve/reject buttons
// - Real-time count badge
```

### Payroll Processing:
```typescript
// Create new payroll run
// Link approved timesheets to payroll run
// Calculate total payroll
// Create JEs automatically
// Mark timesheets as paid
// Generate pay stubs (PDF)
```

---

**Complete timesheet ecosystem spanning 3 apps (Admin, Student Portal, future Employee Portal) with full approval workflows and accounting integration!** 🚀





