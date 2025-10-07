# TIMESHEET UI REFACTOR - Personal Entry System
**Date:** October 6, 2025 - 12:05 AM  
**Status:** Needs Refactoring (Current: 1,712 lines, Target: ~2,000 lines)

---

## 🎯 CURRENT PROBLEM

The "My Timesheets" tab currently shows ALL timesheets and lets you create for anyone.

**It should be:** Personal timesheet entry where YOU (Landon or Andre) enter YOUR OWN hours.

---

## ✅ NEW DESIGN SPEC

### Tab 1: "My Timesheets" (Personal Entry)

#### Header:
```
My Timesheets - Landon Whitworth
[<< Previous Week]  Week of Oct 1-7, 2025  [Next Week >>]
```

#### Weekly Calendar Grid (Sunday-Saturday):
```
┌────────────────────────────────────────────────────────────────────────┐
│ Sunday, Oct 1, 2025                                         [✓] Worked  │
│ Hours: [8.0]  Project/Team: [NGI Capital LLC - CEO Duties ▼]           │
│ Task Description: [Board meeting prep, investor calls       ]           │
├────────────────────────────────────────────────────────────────────────┤
│ Monday, Oct 2, 2025                                          [✓] Worked │
│ Hours: [9.0]  Project/Team: [NGI Capital Advisory - Projects ▼]        │
│ Task Description: [Student project reviews, client meetings  ]          │
├────────────────────────────────────────────────────────────────────────┤
│ Tuesday, Oct 3, 2025                                         [✓] Worked │
│ Hours: [8.5]  Project/Team: [NGI Capital LLC - Finance ▼]              │
│ Task Description: [Financial statement review, tax planning ]           │
├────────────────────────────────────────────────────────────────────────┤
│ Wednesday, Oct 4, 2025                                       [ ] Worked │
│ (Day Off)                                                               │
├────────────────────────────────────────────────────────────────────────┤
│ Thursday, Oct 5, 2025                                        [✓] Worked │
│ Hours: [10.0]  Project/Team: [NGI Capital Advisory - Marketing ▼]      │
│ Task Description: [Content creation, social media strategy  ]           │
├────────────────────────────────────────────────────────────────────────┤
│ Friday, Oct 6, 2025                                          [✓] Worked │
│ Hours: [7.5]  Project/Team: [NGI Capital LLC - Operations ▼]           │
│ Task Description: [Team meetings, process optimization      ]           │
├────────────────────────────────────────────────────────────────────────┤
│ Saturday, Oct 7, 2025                                        [ ] Worked │
│ (Weekend)                                                               │
└────────────────────────────────────────────────────────────────────────┘

Total Hours: 43.0h  (3.0h overtime)

[Save Draft]  [Submit for Approval →]
```

#### Features:
- Checkbox per day: "Did you work this day?"
- If checked → show hours, project/team, task description
- If unchecked → grayed out, shows "(Day Off)" or "(Weekend)"
- Auto-calculate total hours
- Show overtime alert if >40 hours
- Week navigation (previous/next buttons)
- Save draft (status: draft)
- Submit for approval (status: submitted)

#### Past Timesheets Section:
```
Your Timesheet History:

[Card] Week of Sep 24-30, 2025  •  40.0h  •  [✓ Approved]  •  Paid
[Card] Week of Oct 1-7, 2025    •  43.0h  •  [⏳ Pending]   •  Awaiting Andre's approval
[Card] Week of Oct 8-14, 2025   •  38.5h  •  [📝 Draft]    •  Not submitted yet
```

---

### Tab 2: "Approve Timesheets" (Review Others)

#### Header:
```
Approve Team Member Timesheets
Pending Approvals: 2
```

#### Approval Queue:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Expand] Andre Nurmamade - Week of Oct 1-7, 2025                      │
│ Total Hours: 42.5h (2.5h overtime)                                     │
│ Submitted: Oct 8, 2025 at 9:00 AM                                      │
│                                                                          │
│ [Expanded View]                                                          │
│ Sunday:    0.0h  (Day Off)                                              │
│ Monday:    8.0h  → NGI Capital LLC - Finance                           │
│            Task: Q3 financial close, journal entry review               │
│ Tuesday:   9.0h  → NGI Capital Advisory - Projects                     │
│            Task: Student onboarding, project setup                      │
│ Wednesday: 8.5h  → NGI Capital LLC - Engineering                       │
│            Task: App development, code review                           │
│ Thursday:  9.0h  → NGI Capital Advisory - Marketing                    │
│            Task: Content creation, client outreach                      │
│ Friday:    8.0h  → NGI Capital LLC - Operations                        │
│            Task: Team meetings, planning                                │
│ Saturday:  0.0h  (Weekend)                                              │
│                                                                          │
│ Policy Checks:                                                          │
│ ✓ No days over 12 hours                                                │
│ ⚠ Total hours: 42.5 (2.5h overtime - verify if authorized)            │
│ ✓ All days have project/team assigned                                  │
│ ✓ Task descriptions provided                                            │
│                                                                          │
│ [Approve ✓]  [Reject ✗]  [Request Changes]                            │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Features:
- List of all pending timesheets
- Expandable cards to see full week detail
- Policy validation checks (overtime, max hours, missing fields)
- View task descriptions for each day
- Approve/reject/request changes buttons
- Can view but NOT edit (read-only)

---

## 🔄 WORKFLOW EXAMPLES

### Example 1: Landon Enters His Hours (NGI Capital LLC)
```
Week: Oct 1-7, 2025

Mon: 8h → NGI Capital LLC - CEO Duties → Board prep, investor calls
Tue: 8h → NGI Capital LLC - Finance → Financial review
Wed: 8h → NGI Capital Advisory - Projects → Student meetings
Thu: 8h → NGI Capital LLC - Operations → Team planning
Fri: 8h → NGI Capital LLC - Strategic Planning → Quarterly goals

Total: 40h → Submit → Andre approves
```

### Example 2: Andre Enters His Hours (Multi-Entity)
```
Week: Oct 1-7, 2025

Mon: 8h → NGI Capital LLC - Finance → Q3 close
Tue: 9h → NGI Capital Advisory - Projects → Student onboarding  
Wed: 8.5h → NGI Capital LLC - Engineering → App development
Thu: 9h → NGI Capital Advisory - Marketing → Content creation
Fri: 8h → NGI Capital LLC - Operations → Team meetings

Total: 42.5h (2.5h overtime) → Submit → Landon approves
```

---

## 🎨 UI MOCKUP

### My Timesheets Tab:
```
┌─────────────────────────────────────────────────────────────────────┐
│ My Timesheets                                                       │
│ Week of Oct 1-7, 2025  [<< Prev] [Next >>]                         │
├─────────────────────────────────────────────────────────────────────┤
│ [Card] Sunday, Oct 1 - Did Not Work                                │
├─────────────────────────────────────────────────────────────────────┤
│ [Card] Monday, Oct 2                                                │
│ [✓] I worked this day                                               │
│ Hours: [8.0] │ Project/Team: [CEO Duties ▼] │ Task: [_______]     │
├─────────────────────────────────────────────────────────────────────┤
│ (Repeat for each day...)                                            │
├─────────────────────────────────────────────────────────────────────┤
│ Total: 40.0 hours                                                   │
│ [Save Draft] [Submit for Approval]                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Approve Timesheets Tab:
```
┌─────────────────────────────────────────────────────────────────────┐
│ Approve Team Member Timesheets                                      │
│ You have 2 timesheets pending your approval                         │
├─────────────────────────────────────────────────────────────────────┤
│ [Card] Andre Nurmamade - Week of Oct 1-7 (42.5h)                   │
│ [View Details] [Approve] [Reject]                                   │
├─────────────────────────────────────────────────────────────────────┤
│ [Card] Jane Doe - Week of Oct 1-7 (40.0h)                          │
│ [View Details] [Approve] [Reject]                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 DATABASE STRUCTURE (Already Built)

Tables are ready:
- `timesheets` - Main record
- `timesheet_entries` - Daily entries with task description
- APIs are ready:
  - POST /api/timesheets
  - POST /api/timesheets/{id}/entries
  - POST /api/timesheets/{id}/submit
  - POST /api/timesheets/{id}/approve
  - POST /api/timesheets/{id}/reject

---

## 🚀 IMPLEMENTATION NEEDED

### Changes to `apps/desktop/src/app/employees/page.tsx`:

1. **Add current user detection:**
   ```typescript
   const { user } = useClerk();
   const currentUserEmail = user?.primaryEmailAddress?.emailAddress;
   const currentEmployee = employees.find(e => e.email === currentUserEmail);
   ```

2. **Rebuild "My Timesheets" tab:**
   - Generate Sunday-Saturday for current week
   - Checkbox per day: "I worked this day"
   - If checked: show hours input, project/team dropdown, task description textarea
   - If unchecked: gray out, show "(Day Off)"
   - Real-time total calculation
   - Save draft / Submit buttons

3. **Create "Approve Timesheets" tab:**
   - Fetch timesheets WHERE status = 'submitted' AND employee_id != currentEmployee.id
   - Show expandable cards
   - View Details modal (read-only)
   - Approve/Reject buttons
   - Policy validation warnings

4. **Fix tab layout:**
   - 2 rows of tabs (already done ✓)
   - 6 tabs total instead of 5

---

## 💡 STUDENT PORTAL INTEGRATION (Future)

### Location: `apps/student/src/app/my-projects/[id]/timesheets/page.tsx`

**Modal in Project View:**
```
[Button] Enter Weekly Timesheet

[Modal Opens]
Project: Website Redesign
Week of Oct 1-7, 2025

Sunday:    [ ] Worked  Hours: [__]  Task: [____________]
Monday:    [✓] Worked  Hours: [8 ]  Task: [Homepage design]
Tuesday:   [✓] Worked  Hours: [7.5]  Task: [Component dev]
...

Total: 15.5h
[Submit to Project Lead]
```

---

## ⏱️ ESTIMATED TIME TO IMPLEMENT

- Refactor "My Timesheets" tab: 1-2 hours
- Build "Approve Timesheets" tab: 1 hour
- Add current user detection: 30 mins
- Testing: 1 hour
- **Total: 3.5-4.5 hours**

---

## 📋 TOMORROW'S PRIORITY

**Option A:** Implement this timesheet refactor (3-4 hours)  
**Option B:** Run tests first, fix bugs, then come back to this  

**Recommendation:** Do this refactor FIRST since it's core to the employee/payroll system, then run all tests.

---

**Current Status:** Employee module is 95% done. Just needs this final timesheet UX polish to be perfect!

**Current Time:** 12:05 AM - Recommend continuing fresh tomorrow morning! 💪





