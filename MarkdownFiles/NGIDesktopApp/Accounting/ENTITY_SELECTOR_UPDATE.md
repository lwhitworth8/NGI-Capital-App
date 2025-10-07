# Entity Selector UI Update
## October 4, 2025

## Changes Made

### 1. Width Increase
- **Before:** 280px (text wrapping to 2 lines, crowded)
- **After:** 420px (all text fits on single line)

### 2. Better Spacing & Typography
- Added `py-2` padding to each item (more breathing room)
- Increased lock icon size: `h-3.5 w-3.5` (was `h-3 w-3`)
- Added `text-sm` to container for better readability
- Used `flex-shrink-0` on icons to prevent squishing

### 3. Active Entity Visual Indicator
- **NGI Capital LLC** now shows **(Active)** in green
- Only active, available entities show this badge
- Color: `text-green-600` with `font-medium`

### 4. Improved Disabled Entity Display
- Lock icon on left (more prominent)
- "Pending Conversion" in orange (`text-orange-600`)
- Ownership percentage only shown for disabled subsidiaries
- Better visual hierarchy

## Current Entity Display

### Entity Dropdown Now Shows:

```
[Building Icon] [Dropdown ▼]

Available Options:
✓ NGI Capital LLC (Active)              <-- Selectable, Default
🔒 NGI Capital Advisory LLC - 100% owned  Pending Conversion  <-- Greyed out
🔒 Creator Terminal Inc. - 100% owned     Pending Conversion  <-- Greyed out
```

## Database State Verified

```
ID: 1, Name: NGI Capital LLC, Status: active, Available: True
ID: 2, Name: NGI Capital Advisory LLC, Status: planned, Available: False
ID: 3, Name: Creator Terminal Inc., Status: planned, Available: False
```

## Visual Improvements

- No more text wrapping
- Cleaner, less crowded appearance
- Clear active status
- Better disabled state indication
- Professional spacing

## Files Modified

1. `apps/desktop/src/components/accounting/EntitySelector.tsx`
   - Width: 280px -> 420px
   - Added active badge
   - Improved spacing and typography
   - Better disabled state styling


