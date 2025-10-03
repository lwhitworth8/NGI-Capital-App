# NGI Capital App - Authentication System

## Overview
Comprehensive authentication system that ensures users are properly authenticated before accessing any part of the application.

## Authentication Flow

### 1. Initial Load
```
User Opens App
    ↓
LoadingScreen: "Initializing authentication..."
    ↓
Clerk SDK Loads
```

### 2. Clerk Verification
```
Check if User is Signed In
    ↓
If NOT Signed In → LoadingScreen: "Redirecting to sign in..."
    ↓
If Signed In → Continue
```

### 3. Backend Verification
```
LoadingScreen: "Verifying your account..."
    ↓
Fetch Clerk Token
    ↓
Call Backend: apiClient.getProfile()
    ↓
Verify User Email & Profile
    ↓
Success → Load Application
```

### 4. Error Handling
```
If Any Step Fails:
    ↓
Display Error Screen with Message
    ↓
Wait 2 seconds
    ↓
Sign Out & Redirect to Sign In
```

## Components

### AuthGate (providers.tsx)
- **Purpose**: Main authentication gate that blocks access until verified
- **States**:
  - `isLoaded`: Clerk SDK initialization status
  - `isSignedIn`: Clerk authentication status
  - `authVerified`: Backend verification status
  - `verifying`: Currently verifying with backend
  - `error`: Any authentication errors

### AuthProvider (lib/auth.tsx)
- **Purpose**: Provides user context throughout the app
- **Features**:
  - Loads Clerk user data
  - Enriches with backend profile
  - Provides login/logout functions
  - Maintains authentication state

### LoadingScreen Component
- Professional loading spinner
- Clear status messages
- Consistent styling with theme

### Error Screen
- Clear error icon and message
- Automatic redirect to sign-in
- User-friendly design

## Loading States

| State | Message | Duration |
|-------|---------|----------|
| Clerk Loading | "Initializing authentication..." | Until Clerk loads |
| Not Signed In | "Redirecting to sign in..." | Immediate redirect |
| Backend Verify | "Verifying your account..." | 1-3 seconds |
| Error | Error message + redirect | 2 seconds |
| Loading Workspace | "Loading your workspace..." | Until app loads |

## Error Scenarios

### 1. No Clerk Token
- **Error**: "No authentication token available"
- **Action**: Sign out and redirect to sign-in

### 2. Backend API Failure
- **Error**: "Unable to load user profile"
- **Action**: Sign out and redirect to sign-in

### 3. Invalid User
- **Error**: Backend returns no email
- **Action**: Sign out and redirect to sign-in

## Console Logging

All authentication steps are logged to the console for debugging:

```javascript
// AuthGate
console.log('Auth verified:', profile.email)
console.error('Auth verification failed:', err)

// AuthProvider
console.log('AuthProvider: Loading user data for', email)
console.log('AuthProvider: Successfully loaded backend profile')
console.warn('AuthProvider: Could not load backend profile, using Clerk data')
console.error('AuthProvider: Hydration error', err)
```

## Development Mode

When `NODE_ENV !== 'production'` and `NEXT_PUBLIC_ADVISORY_DEV_OPEN === '1'`:
- Authentication checks are bypassed
- App loads immediately
- Useful for local development

## User Experience

### Before (Issues):
- ❌ Blank screens
- ❌ "User not found" errors
- ❌ Database showing empty
- ❌ No indication of loading state
- ❌ API calls failing silently

### After (Improvements):
- ✅ Professional loading screens at every step
- ✅ Clear status messages
- ✅ Backend verification before app access
- ✅ Automatic sign-out on auth failure
- ✅ Comprehensive error handling
- ✅ Full authentication logging
- ✅ No blank states ever

## Testing

To test the authentication flow:

1. **Clear cookies and sign out**
2. **Open the app**
   - Should see: "Initializing authentication..."
   - Then: "Redirecting to sign in..."
3. **Sign in with valid credentials**
   - Should see: "Verifying your account..."
   - Then: App loads successfully
4. **Close and reopen**
   - Should maintain session (no re-sign-in required)
5. **Use invalid token**
   - Should see error screen
   - Then: Auto sign-out and redirect

## Security

- ✅ Clerk token verified before every API call
- ✅ Backend validates all requests
- ✅ Auto sign-out on authentication failures
- ✅ No sensitive data exposed in error messages
- ✅ Session management via Clerk

## Future Enhancements

1. **Retry Logic**: Automatic retry on network failures
2. **Offline Mode**: Cached data when offline
3. **Session Refresh**: Automatic token refresh
4. **Role-Based Access**: Admin vs. User permissions
5. **Multi-Factor Auth**: Optional 2FA via Clerk

