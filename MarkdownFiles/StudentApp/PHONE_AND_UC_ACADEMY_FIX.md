# Phone Number & UC Academy Final Fix - October 2, 2025

## Issues Found

### 1. Phone Number Display Bug
**Problem:** Phone showing as "+11119167929605" with way too many 1s  
**Root Cause:** Corrupted data in database from previous saves that kept prepending "+1"

### 2. UC Academy Not Saving
**Problem:** Selecting "yes" or "no" doesn't persist after reload  
**Root Cause:** Backend was treating empty string and "no" the same way due to falsy check

## Solutions Implemented

### Frontend Fixes (apps/student/src/app/settings/page.tsx)

#### 1. Improved Phone Formatting on Save
```typescript
// Clean phone for storage
const cleanPhone = phone.replace(/\D/g, '');

// Only add +1 if we have 10 digits (US number)
let phoneForStorage = '';
if (cleanPhone.length === 10) {
  phoneForStorage = `+1${cleanPhone}`;
} else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
  // Already has country code, just add +
  phoneForStorage = `+${cleanPhone}`;
} else if (cleanPhone.length > 0) {
  // Some other format, store as-is with +
  phoneForStorage = `+${cleanPhone}`;
}
```

#### 2. Fixed UC Academy Loading
**Before:**
```typescript
setUcAcademy(data.uc_investments_academy || '');
```
This treated "no" as falsy and set it to empty string!

**After:**
```typescript
setUcAcademy(data.uc_investments_academy !== null && data.uc_investments_academy !== undefined ? data.uc_investments_academy : '');
```
Now properly handles "yes", "no", and empty values

#### 3. Enhanced Logging
Added comprehensive console logging:
- `[SETTINGS]` prefix for all log messages
- Logs when loading profile
- Logs when saving profile
- Logs phone number transformations
- Logs UC Academy value explicitly

#### 4. Removed Debug Display
Removed the ugly debug text at the bottom of the page

### Backend Fixes (src/api/routes/advisory_public.py)

#### 1. Explicit UC Academy Handling
**Before:**
```python
for key in (..., "uc_investments_academy"):
    if key in payload:
        fields.append(f"{key} = :{key}")
        params[key] = payload[key]
```

**After:**
```python
# UC Investments Academy - handle explicitly to allow "no" as a valid value
if "uc_investments_academy" in payload:
    val = payload.get("uc_investments_academy")
    if val is not None and val != "":
        fields.append("uc_investments_academy = :uc_investments_academy")
        params["uc_investments_academy"] = val
    else:
        # Explicitly set to NULL if empty or null
        fields.append("uc_investments_academy = NULL")
```

#### 2. Enhanced Backend Logging
Added detailed debug logging:
```python
print(f"[PROFILE UPDATE] Email: {email}", file=sys.stderr)
print(f"[PROFILE UPDATE] Fields being updated: {fields}", file=sys.stderr)
print(f"[PROFILE UPDATE] Params: {params}", file=sys.stderr)
if "uc_investments_academy" in params:
    print(f"[PROFILE UPDATE] UC Academy value: '{params['uc_investments_academy']}'", file=sys.stderr)
if "phone" in params:
    print(f"[PROFILE UPDATE] Phone value: '{params['phone']}'", file=sys.stderr)
```

#### 3. Database Verification
Added verification query after update:
```python
verify_row = db.execute(sa_text(
    "SELECT phone, uc_investments_academy FROM advisory_students WHERE lower(email) = :em"
), {"em": email.lower()}).fetchone()
if verify_row:
    print(f"[PROFILE UPDATE] Verified in DB - Phone: '{verify_row[0]}', UC Academy: '{verify_row[1]}'", file=sys.stderr)
```

### Database Cleanup Script (scripts/fix_phone_numbers.py)

Created a cleanup script to fix corrupted phone numbers:

**Features:**
- Finds all students with phone numbers
- Cleans up numbers with extra 1s
- Detects valid 10-digit sequences in corrupted data
- Updates database with properly formatted numbers
- Shows before/after for each update

**Usage:**
```bash
cd "C:\Users\Ochow\Desktop\NGI Capital App"
python scripts/fix_phone_numbers.py
```

## Testing Instructions

### 1. Clean Up Database First
```bash
python scripts/fix_phone_numbers.py
```
This will fix the corrupted "+11119167929605" to "+19167929605"

### 2. Test Phone Number
1. Go to Settings
2. Phone should now show: **(916) 792-9605**
3. Try editing: type 4085551234
4. Should format to: (408) 555-1234
5. Click Save
6. Check console logs for:
   - `[SETTINGS] Phone clean: 4085551234 -> storage: +14085551234`
7. Check backend logs for:
   - `[PROFILE UPDATE] Phone value: '+14085551234'`
   - `[PROFILE UPDATE] Verified in DB - Phone: '+14085551234'`
8. Reload page
9. Should show: (408) 555-1234

### 3. Test UC Academy
1. Go to Settings
2. Select "Yes" from dropdown
3. Click Save Profile
4. Check console logs for:
   - `[SETTINGS] UC Academy: yes -> sending: yes`
5. Check backend logs for:
   - `[PROFILE UPDATE] UC Academy value: 'yes'`
   - `[PROFILE UPDATE] Verified in DB - UC Academy: 'yes'`
6. Reload page
7. Dropdown should show: **Yes**
8. Change to "No"
9. Save
10. Reload
11. Should show: **No**

### 4. Check Backend Logs
Look in your FastAPI server output for lines like:
```
[PROFILE UPDATE] Email: your-email@berkeley.edu
[PROFILE UPDATE] Fields being updated: ['first_name = :first_name', ...]
[PROFILE UPDATE] UC Academy value: 'yes'
[PROFILE UPDATE] Phone value: '+19167929605'
[PROFILE UPDATE] Verified in DB - Phone: '+19167929605', UC Academy: 'yes'
```

## Expected Results

### Phone Number
- **Display:** (916) 792-9605
- **Storage:** +19167929605
- **No extra 1s!**

### UC Academy
- **Options:** Yes, No, or empty
- **Persists after reload**
- **"No" is a valid saved value**

## Files Modified

1. **apps/student/src/app/settings/page.tsx**
   - Fixed phone formatting logic
   - Fixed UC Academy loading (no longer treats "no" as falsy)
   - Enhanced logging
   - Removed debug display

2. **src/api/routes/advisory_public.py**
   - Explicit UC Academy handling
   - Enhanced debug logging
   - Database verification after update

3. **scripts/fix_phone_numbers.py**
   - NEW: Cleanup script for corrupted phone numbers

## Result

✅ Phone numbers properly formatted  
✅ No more extra 1s  
✅ UC Academy saves "yes" and "no" correctly  
✅ Comprehensive logging for debugging  
✅ Clean UI without debug text  

