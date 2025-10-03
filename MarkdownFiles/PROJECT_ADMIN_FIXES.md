# Project Admin Module Fixes - Oct 2, 2025

## Issues Fixed

### 1. Save Not Working
**Problem:** Changes appeared to save but then reloaded without actually persisting.

**Root Cause:** The parent component's `onSave` wrapper was calling `setForm(data)` and then immediately calling the old `onSave(publish)` function, which read from the old state before the update took effect.

**Solution:** Rewrote the `onSave` handler in `apps/desktop/src/app/ngi-advisory/projects/page.tsx` to:
- Accept the data directly from the modal
- Use the passed data instead of reading from state
- Properly call backend APIs (`advisoryUpdateProject`, `advisoryCreateProject`)
- Handle leads and questions updates separately
- Close modal and reload projects after successful save

### 2. Client Logos Showing as Windows UI Placeholders
**Problem:** Client logos were showing as broken image icons (Windows default broken image UI) instead of actual logos.

**Root Cause:** The logo image files don't exist at the specified paths (e.g., `/clients/goldman-sachs.svg`).

**Solution:** Added `onError` handlers to all client logo `<img>` tags:
```typescript
onError={(e) => {
  e.currentTarget.style.display = 'none'
}}
```
This gracefully hides broken images instead of showing the broken image icon.

### 3. Client Names Appearing Twice / Messy Display
**Problem:** Client names were being displayed in a confusing way, potentially showing duplicates or long comma-separated strings.

**Root Cause:** 
- The new multi-client feature stores clients in `partner_logos` array as `{name, logo}` objects
- It also concatenates names into `client_name` for backward compatibility
- Display components were trying to show from both sources or just the concatenated string

**Solution:** Updated `ModernProjectCard.tsx` and `ProjectDetailModal.tsx` to:
- Check if `partner_logos` array exists and has items
- If yes, display each client individually with their logo
- If no, fallback to old `client_name` display for legacy projects
- Each client now shows as a separate badge with logo + name

## Files Modified

1. **apps/desktop/src/app/ngi-advisory/projects/page.tsx**
   - Rewrote `onSave` handler to properly use passed data
   - Fixed `onDelete` handler

2. **apps/desktop/src/components/advisory/ProjectEditorModal.tsx**
   - Removed duplicate `onClose()` and `toast.success()` calls
   - Added `onError` handlers for client logos
   - Let parent handle modal closing and success messages

3. **apps/desktop/src/components/advisory/ModernProjectCard.tsx**
   - Updated client display to use `partner_logos` array
   - Added proper multi-client support with individual badges
   - Added `onError` handler for logos

4. **apps/desktop/src/components/advisory/ProjectDetailModal.tsx**
   - Updated client display to use `partner_logos` array
   - Added proper multi-client support
   - Added `onError` handler for logos

## Result

- ✅ Projects now save properly
- ✅ Client logos gracefully hide if images don't exist
- ✅ Multiple clients display cleanly with individual badges
- ✅ Each client shows once with their logo (if available)
- ✅ Backward compatible with legacy projects that only have `client_name`

