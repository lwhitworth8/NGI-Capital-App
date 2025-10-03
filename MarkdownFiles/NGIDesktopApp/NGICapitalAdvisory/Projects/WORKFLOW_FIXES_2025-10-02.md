# Advisory Projects Workflow Fixes - October 2, 2025

## Summary

Comprehensive fixes to the NGI Capital Advisory Projects admin module to ensure all fields save properly, logos display correctly, and the full workflow (create, edit, save draft, publish) works flawlessly.

## Issues Fixed

### 1. Client Logos - Liverpool FC, Fenway Sports Group, UC Investments

**Problem:** Missing logos for new demo projects.

**Solution:** Updated all logo dictionaries across the codebase:

**Files Modified:**
- `apps/desktop/src/components/advisory/ProjectEditorModal.tsx`
- `apps/desktop/src/components/advisory/ProjectDetailModal.tsx`
- `apps/desktop/src/components/advisory/ModernProjectCard.tsx`
- `apps/student/src/components/projects/StudentProjectModal.tsx`
- `apps/student/src/components/projects/ModernProjectCard.tsx`

**Added:**
```typescript
'UC Investments': '/clients/uc-investments.svg',  // Changed from uc-endowment
'Liverpool FC': 'https://logo.clearbit.com/liverpoolfc.com',
'Fenway Sports Group': 'https://logo.clearbit.com/fenway-sports.com',
```

### 2. Project Leads Not Displayed

**Problem:** Project leads were being saved but not displayed in the detail modal.

**Solution:** Added `useEffect` hook to fetch leads from the API and display them with proper styling.

**File Modified:** `apps/desktop/src/components/advisory/ProjectDetailModal.tsx`

**Added:**
- API call to `/api/advisory/projects/{id}/leads` on mount
- New UI section showing project leads as blue badges
- Proper error handling for failed API calls

### 3. Team Requirements (Majors) Not Displayed

**Problem:** Team requirements were saved in the database but not shown in the detail view.

**Solution:** Added dedicated UI section to display preferred majors as green badges.

**File Modified:** `apps/desktop/src/components/advisory/ProjectDetailModal.tsx`

**Added:**
- Check for `team_requirements` array in project data
- New UI section showing each major as a separate badge
- Proper conditional rendering

### 4. Save Workflow Verification

**Problem:** Need to ensure all fields persist correctly through create, edit, draft, and publish workflows.

**Solution:** Verified existing save logic and created comprehensive tests.

**Existing Workflow (Verified Working):**
- Create project: saves to `/api/advisory/projects` (POST)
- Set leads: saves to `/api/advisory/projects/{id}/leads` (PUT)
- Set questions: saves to `/api/advisory/projects/{id}/questions` (PUT)
- Update project: saves to `/api/advisory/projects/{id}` (PUT)
- Publish validation: requires at least one project lead before status can be "active"

**File:** `apps/desktop/src/app/ngi-advisory/projects/page.tsx` (Lines 666-718)

### 5. Test Coverage

**Created:** `tests/test_advisory_projects_workflow.py`

**Test Coverage:**
1. `test_create_project_with_all_fields` - Full workflow test
   - Create project with all fields
   - Set project leads
   - Verify all data persists
   - Edit project
   - Verify updates
   - Publish project
   - Verify status change

2. `test_publish_without_leads_fails` - Validation test
   - Ensures projects cannot be published without leads
   - Verifies 422 error is returned

3. `test_team_requirements_json_handling` - JSON handling test
   - Create project with team requirements array
   - Verify proper JSON storage and retrieval
   - Update team requirements
   - Verify updates persist

## API Endpoints Verified

### Projects
- `GET /api/advisory/projects` - List all projects
- `POST /api/advisory/projects` - Create project
- `GET /api/advisory/projects/{id}` - Get project details
- `PUT /api/advisory/projects/{id}` - Update project

### Project Leads
- `GET /api/advisory/projects/{id}/leads` - Get project leads
- `PUT /api/advisory/projects/{id}/leads` - Set project leads (replaces all)

### Project Questions
- `GET /api/advisory/projects/{id}/questions` - Get application questions
- `PUT /api/advisory/projects/{id}/questions` - Set application questions (replaces all)

## Database Schema Verified

### Tables
- `advisory_projects` - Main project data
- `advisory_project_leads` - Project leads (many-to-one with projects)
- `advisory_project_questions` - Application questions (many-to-one with projects)
- `advisory_project_assignments` - Student assignments (many-to-one with projects)

### Important Fields
- `team_size` (INTEGER) - Number of team members
- `team_requirements` (TEXT/JSON) - Array of preferred majors
- `partner_logos` (TEXT/JSON) - Array of partner/client logos
- `backer_logos` (TEXT/JSON) - Array of backer logos
- `showcase_pdf_url` (TEXT) - URL to showcase PDF for completed projects

## UI/UX Improvements

### Detail Modal Enhancements
1. **Project Leads Section**
   - Displays all project leads as blue badges
   - Shows email addresses
   - Animated entrance (delay: 0.55s)
   - Dark mode compatible

2. **Preferred Majors Section**
   - Displays all team requirements as green badges
   - Shows major names
   - Animated entrance (delay: 0.58s)
   - Dark mode compatible

3. **Visual Hierarchy**
   - Stats grid (duration, hours, team size) remains prominent
   - Project leads appear below stats
   - Preferred majors appear below leads
   - Description follows with proper spacing

### Form Validation
- Project name: required (4-120 chars)
- Client name: required (2-120 chars)
- Summary: required (20-200 chars)
- Description: required (50-4000 chars) when publishing
- Project leads: at least 1 required when publishing to "active" or "closed"

## Validation Rules

### Draft Status
- Can save with any fields (minimal validation)
- Project leads are optional
- Allows saving partial data

### Active/Closed Status (Publishing)
- All required fields must be filled
- At least one project lead must be assigned
- Returns 422 error if validation fails
- Clear error messages returned to UI

## Success Metrics

- All fields save correctly through create/edit/publish workflow
- Logos display properly for all clients including new ones
- Project leads display in detail modal
- Team requirements display in detail modal
- Tests pass for full workflow
- No data loss on save/reload cycle
- Proper validation prevents invalid publishes

## Future Enhancements

1. **Lead Names Resolution**
   - Currently shows email addresses
   - Could fetch and display full names from employee database

2. **Inline Editing**
   - Add quick-edit functionality for leads/majors in detail view

3. **Audit Trail**
   - Track who made changes and when
   - Display edit history in detail modal

4. **Bulk Operations**
   - Assign leads to multiple projects at once
   - Bulk status changes

## Testing Instructions

### Manual Testing
1. **Create New Project:**
   - Click "+ New" button
   - Fill in all fields (Basic, Details, Team, Media tabs)
   - Add at least one project lead
   - Add team requirements (majors)
   - Save as Draft
   - Verify all fields persist

2. **Edit Existing Project:**
   - Click "Preview" on any project card
   - Click "Edit" in the detail modal
   - Modify fields
   - Save changes
   - Verify updates persist

3. **Publish Project:**
   - Edit a draft project
   - Change status to "Active" or click "Publish & Close"
   - Verify validation requires project lead
   - Add lead if missing
   - Publish successfully

4. **View Project Details:**
   - Click "Preview" on any project
   - Verify all fields display:
     - Hero image
     - Client logos
     - Duration, hours/week, team size
     - Project leads
     - Preferred majors
     - Full description
     - Showcase PDF (if closed project)

### Automated Testing
```bash
# Run the comprehensive workflow test
python tests/test_advisory_projects_workflow.py -v

# Or use pytest
pytest tests/test_advisory_projects_workflow.py -v
```

## Files Modified

1. **Frontend (Admin):**
   - `apps/desktop/src/components/advisory/ProjectEditorModal.tsx`
   - `apps/desktop/src/components/advisory/ProjectDetailModal.tsx`
   - `apps/desktop/src/components/advisory/ModernProjectCard.tsx`

2. **Frontend (Student):**
   - `apps/student/src/components/projects/StudentProjectModal.tsx`
   - `apps/student/src/components/projects/ModernProjectCard.tsx`

3. **Backend:**
   - `src/api/routes/advisory.py` (verified existing endpoints)

4. **Tests:**
   - `tests/test_advisory_projects_workflow.py` (new)
   - `tests/create_test_projects.py` (updated)

## Deployment Notes

- No database migrations required (all columns already exist)
- No breaking changes to API contracts
- Backward compatible with existing projects
- Can deploy to production immediately

## Result

All project workflow issues have been resolved:
- Client logos display correctly
- Project leads save and display properly
- Team requirements save and display properly
- Full workflow (create, edit, draft, publish) works flawlessly
- Comprehensive test coverage added
- Modern, consistent UI across all views

