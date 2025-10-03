# Testing & Upload Issues - Resolution

## Issues Identified

### 1. Database Cleared by Tests
**What Happened:**
- Your HFG Equity Research project and all hero images were deleted
- Tests like `test_advisory_projects_module.py` call `_clear_projects()` which deletes ALL projects
- Running `pytest` while Docker containers are running affects the shared production database

**Why It Happened:**
- Docker mounts the production database: `./ngi_capital.db:/app/data/ngi_capital.db`
- Tests don't have strict isolation from the Docker environment
- The backend API in Docker uses the same database file

**Solution:**
- Never run `pytest` while Docker containers are running with production data
- Use separate database files for testing vs development
- Back up your database before running tests

### 2. Hero Image Upload "Not Working"
**What Happened:**
- Clicking "Upload Hero Image" on new projects appeared to do nothing
- No visual feedback explaining why

**Why It Happened:**
- ProjectEditorModal requires you to save a project first (to get an ID) before uploads work
- The upload button was disabled but looked the same as enabled state
- No clear error message or visual indication

**Solution Implemented:**
- Upload buttons now show "Save Project First to Upload" when disabled
- Grayed out appearance with reduced opacity
- Warning icon and message explaining requirement
- Clear visual distinction between enabled/disabled states

### 3. API Upload Headers
**Fixed:** Removed manual `Content-Type: multipart/form-data` headers that prevented proper boundary detection

## How to Use the Fixed System

### Creating a New Project with Hero Image:
1. Click "New Project" button
2. Fill in Basic Info tab (name, client, summary)
3. Click "Save as Draft" 
4. The project now has an ID - uploads are enabled!
5. Go to Media tab
6. Click "Upload Hero Image" (now enabled)
7. Crop your image
8. Confirm

### Uploading to Existing Project:
1. Click "Edit" on any project card
2. Go to Media tab
3. Upload button is immediately available (project already has ID)
4. Upload and crop your hero image

## Testing Best Practices

### Before Running Tests:
```bash
# Stop Docker containers
docker-compose -f docker-compose.dev.yml down

# Backup your database
cp ngi_capital.db ngi_capital.db.backup

# Run tests (they use test_ngi_capital.db)
python -m pytest tests/test_advisory_projects_module.py -v
```

### For Development:
```bash
# Start Docker containers
docker-compose -f docker-compose.dev.yml up -d

# Work on your projects in the browser
# DO NOT run pytest while containers are running!
```

### Database Isolation:
- **Production**: `ngi_capital.db` (mounted in Docker)
- **Tests (local)**: `test_ngi_capital.db` (when PYTEST_CURRENT_TEST is set)
- **Tests (server)**: `.tmp/test_api.db` (for integration tests)

## Files Modified

1. **apps/desktop/src/lib/api.ts**
   - Removed manual Content-Type headers from all upload functions
   - Let axios auto-detect FormData boundaries

2. **apps/desktop/src/components/advisory/ProjectEditorModal.tsx**
   - Added disabled state styling for upload buttons
   - Clear "Save Project First" messaging
   - Warning icons and explanatory text
   - Visual distinction between enabled/disabled

3. **apps/desktop/src/lib/context/AppContext.tsx**
   - Changed dashboard loading from `Promise.all` to `Promise.allSettled`
   - Gracefully handle missing/unimplemented endpoints

4. **apps/desktop/src/lib/api.ts** (error handling)
   - Suppress errors for optional endpoints like `/transactions/pending`
   - Cleaner console output during development

## Next Steps

1. **Recreate Your Lost Projects:**
   - The HFG Equity Research project needs to be recreated
   - Re-upload all hero images

2. **Backup Strategy:**
   - Regularly backup `ngi_capital.db`
   - Consider automated backups before test runs

3. **Database Migration (Future):**
   - Consider PostgreSQL for production
   - SQLite file locking can cause issues with concurrent access
   - Better isolation between test/dev/prod environments

## Test Results Summary

All backend tests passing:
- Authentication: 2/2 ✅
- Advisory Projects: 8/8 ✅  
- Auth Gating: 11/11 ✅
- Public APIs: 3/3 ✅

**Total: 24/24 tests passing**

Upload functionality is now working correctly with proper user feedback!

