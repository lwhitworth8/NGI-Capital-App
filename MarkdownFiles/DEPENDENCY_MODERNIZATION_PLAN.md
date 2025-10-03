# NGI Capital App - Dependency Modernization Plan
**Date**: January 2025  
**Purpose**: Comprehensive upgrade to latest stable dependencies and modern code patterns

---

## 🎯 Current State Analysis

### Frontend (Desktop & Student Apps)

**Current Versions:**
- Next.js: **14.2.32** → Target: **15.1.8** (latest stable)
- React: **18.2.0** → Target: **18.3.1** (stable) or **19.x** (cutting edge)
- @clerk/nextjs: **6.31.6** → Check latest
- TypeScript: **5.3.2** / **5.5.4** → Target: **5.7.x**
- Tailwind CSS: **3.3.6** / **3.4.9** → Target: **4.x** (major update)

**Key Findings:**
- ✅ Already using App Router (good!)
- ⚠️ Next.js 14 → 15 requires migration for breaking changes
- ⚠️ React 19 has significant changes (optional upgrade)
- ⚠️ Tailwind 4 is a major rewrite (CSS-first approach)

### Backend (FastAPI)

**Current Versions:**
- FastAPI: **0.116.1** → Target: **0.116.x** (latest patch)
- Uvicorn: **0.27.0** → Target: **0.34.x**
- SQLAlchemy: **2.0.36** → Target: **2.0.x** (latest patch)
- Pydantic: **2.8.0** → Target: **2.10.x**
- Python: **3.11** → Consider **3.13** (latest)

**Key Findings:**
- ✅ Already on modern FastAPI 0.116
- ✅ Already using SQLAlchemy 2.x and Pydantic 2.x
- ⚠️ Many dependencies need minor version bumps
- ⚠️ Security patches available for some packages

---

## 📋 Migration Strategy

### Phase 1: Non-Breaking Updates (Low Risk)
**Estimated Time**: 2-3 hours

1. **Update Node packages (patch/minor versions)**
   - Update all Radix UI components to latest
   - Update Tanstack Query, Lucide icons, date-fns
   - Update dev dependencies (ESLint, Prettier, Jest)

2. **Update Python packages (patch versions)**
   - FastAPI 0.116.1 → 0.116.x
   - Update security-related packages (cryptography, etc.)
   - Update utility packages

3. **Run Tests**
   - Verify no breaking changes
   - Fix any type errors
   - Run Snyk scan

### Phase 2: Next.js 14 → 15 Migration (Medium Risk)
**Estimated Time**: 4-6 hours

#### Breaking Changes in Next.js 15:

1. **`cookies()` and `headers()` are now async**
   ```tsx
   // OLD (Next.js 14)
   import { cookies } from 'next/headers'
   const theme = cookies().get('theme')
   
   // NEW (Next.js 15)
   import { cookies } from 'next/headers'
   const theme = (await cookies()).get('theme')
   ```

2. **`fetch` caching defaults changed**
   - Previously: `cache: 'force-cache'` by default
   - Now: `cache: 'no-store'` by default
   - **Action**: Explicitly set caching strategy

3. **Route handlers are now cached by default**
   - Need to opt-out with `export const dynamic = 'force-dynamic'`

4. **Updated ESLint rules**
   ```bash
   npm install -D eslint-config-next@latest
   ```

#### Migration Steps:

1. Update Next.js and React:
   ```bash
   cd apps/desktop
   npm install next@15.1.8 react@18.3.1 react-dom@18.3.1
   
   cd ../student
   npm install next@15.1.8 react@18.3.1 react-dom@18.3.1
   ```

2. Run Next.js codemods:
   ```bash
   npx @next/codemod@latest upgrade latest
   ```

3. Update all `cookies()` and `headers()` calls to be async:
   - Search for: `cookies().` and `headers().`
   - Replace with: `(await cookies()).` and `(await headers()).`

4. Review fetch calls and add explicit caching:
   ```tsx
   // For static data
   fetch(url, { cache: 'force-cache' })
   
   // For dynamic data
   fetch(url, { cache: 'no-store' })
   
   // For revalidated data
   fetch(url, { next: { revalidate: 3600 } })
   ```

5. Update middleware if using Next.js auth patterns

### Phase 3: React 19 Migration (Optional - High Risk)
**Estimated Time**: 6-8 hours  
**Recommendation**: **Skip for now**, wait for ecosystem maturity

**Why Skip:**
- Major breaking changes
- Many libraries not yet compatible
- Clerk may not be fully compatible yet
- Radix UI may need updates

**If proceeding later:**
- New hooks: `useFormStatus`, `useOptimistic`
- Form actions become native
- Ref as a prop (no more forwardRef)
- Async components get better support

### Phase 4: Tailwind CSS 3 → 4 Migration (Optional - Medium Risk)
**Estimated Time**: 3-4 hours  
**Recommendation**: **Defer to later**, focus on functionality first

**Major Changes:**
- CSS-first configuration (postcss.config.js instead of tailwind.config.js)
- New engine (Oxide)
- Breaking changes in some utility classes

### Phase 5: Python/FastAPI Updates (Low-Medium Risk)
**Estimated Time**: 2-3 hours

1. Update FastAPI and dependencies:
   ```bash
   # Update requirements.txt with latest stable versions
   fastapi==0.116.4
   uvicorn==0.34.2
   sqlalchemy>=2.0.40,<3
   pydantic>=2.10.6,<3
   starlette==0.41.3
   ```

2. Test all API endpoints

3. Verify Clerk integration still works

4. Run pytest suite

---

## 🔄 Recommended Execution Order

### Immediate (This Session):

✅ **Phase 1: Non-Breaking Updates**
- Low risk, immediate security benefits
- Gets us up-to-date with patches

✅ **Phase 2: Next.js 15 Migration**
- Important for staying current
- Security and performance benefits
- Manageable breaking changes

### Deferred (Next Sprint):

⏸️ **Phase 3: React 19** - Wait 3-6 months for ecosystem
⏸️ **Phase 4: Tailwind 4** - Wait for stability, not critical

### Ongoing:

🔄 **Phase 5: Python Updates** - Do after Next.js migration

---

## 🧪 Testing Strategy

### After Each Phase:

1. **Desktop App Tests:**
   ```bash
   cd apps/desktop
   npm run type-check
   npm run lint
   npm run test
   npm run e2e
   ```

2. **Student App Tests:**
   ```bash
   cd apps/student
   npm run type-check
   npm run test
   ```

3. **Backend Tests:**
   ```bash
   pytest -q
   ```

4. **Integration Tests:**
   - Test Clerk authentication flow
   - Test API endpoints from frontend
   - Test file uploads
   - Test all major user flows

5. **Security Scan:**
   ```bash
   npx snyk test --all-projects --severity-threshold=high
   ```

---

## 🎯 Key Files to Update

### Next.js 15 Migration Priority Files:

**Desktop App (`apps/desktop/src/`):**
1. `app/providers.tsx` - Check for cookies/headers usage
2. `app/ngi-advisory/*/page.tsx` - All page components
3. `components/layout/Header.tsx` - Likely uses cookies
4. `lib/api.ts` - May use fetch without explicit caching
5. `middleware.ts` - Middleware patterns may need updates

**Student App (`apps/student/src/`):**
1. `app/page.tsx` - Main landing page
2. `app/*/page.tsx` - All page components
3. `lib/api.ts` - API client
4. `components/ClientRoot.tsx` - Root client wrapper

### Clerk Integration Files (Critical):
- Both apps use Clerk extensively
- Verify compatibility with Next.js 15
- Test auth flows thoroughly

---

## 📊 Risk Assessment

| Phase | Risk Level | Breaking Changes | Effort | Priority |
|-------|-----------|------------------|---------|----------|
| Phase 1: Patches | 🟢 Low | None expected | Low | **HIGH** |
| Phase 2: Next.js 15 | 🟡 Medium | async cookies/headers, fetch defaults | Medium | **HIGH** |
| Phase 3: React 19 | 🔴 High | Many | High | **LOW** |
| Phase 4: Tailwind 4 | 🟡 Medium | Config & utilities | Medium | **LOW** |
| Phase 5: Python | 🟢 Low-Medium | Minimal | Low | **MEDIUM** |

---

## 🔐 Security Considerations

### High Priority Security Updates:

1. **Starlette 0.40.0 → 0.41.3** (FastAPI dependency)
   - Security vulnerability fixes

2. **cryptography package** (Already at 43.0.0+, good!)

3. **Regular Snyk scans** during and after migration

---

## 💡 Modern Pattern Adoptions

While migrating, adopt these Next.js 15 best practices:

### 1. Server Components by Default
```tsx
// Prefer Server Components (default)
export default async function ProjectsPage() {
  const data = await getData()
  return <ProjectsList data={data} />
}

// Use Client Components only when needed
'use client'
export function InteractiveComponent() {
  const [state, setState] = useState()
  return <div onClick={...}>...</div>
}
```

### 2. Explicit Data Fetching Patterns
```tsx
// Static data (cached indefinitely)
const res = await fetch(url, { cache: 'force-cache' })

// Dynamic data (always fresh)
const res = await fetch(url, { cache: 'no-store' })

// Revalidated data (ISR)
const res = await fetch(url, { next: { revalidate: 3600 } })
```

### 3. Parallel Data Fetching
```tsx
export default async function Page() {
  // Fetch in parallel
  const [projects, students] = await Promise.all([
    getProjects(),
    getStudents(),
  ])
  
  return <Dashboard projects={projects} students={students} />
}
```

### 4. Loading and Error States
```tsx
// app/projects/loading.tsx
export default function Loading() {
  return <Skeleton />
}

// app/projects/error.tsx
'use client'
export default function Error({ error, reset }) {
  return <ErrorBoundary error={error} reset={reset} />
}
```

---

## 📝 Rollback Plan

If critical issues arise:

1. **Immediate Rollback:**
   ```bash
   git revert HEAD
   git push origin production
   ```

2. **Package Rollback:**
   ```bash
   npm install next@14.2.32 react@18.2.0
   ```

3. **Database**: SQLite makes this easy (no migrations needed)

4. **Deployment**: Vercel allows instant rollback to previous deployment

---

## ✅ Success Criteria

Migration is successful when:

- ✅ All tests pass (unit, integration, E2E)
- ✅ No TypeScript errors
- ✅ No ESLint errors (or only acceptable warnings)
- ✅ Snyk scan shows no high-severity issues
- ✅ All major user flows work:
  - Student can browse and apply to projects
  - Admin can create and manage projects
  - Admin can manage students and applications
  - Coffee Chats booking works
  - File uploads work
  - Authentication works (Clerk)
- ✅ Performance is equal or better
- ✅ Build times are reasonable
- ✅ No console errors in production

---

## 🚀 Ready to Begin?

Recommended start:
1. ✅ Create backup branch (done - we're on dev/projects-admin)
2. ✅ Committed all work (done)
3. ✅ Pushed to production (done)
4. 🎯 **Start with Phase 1** - Safe updates first
5. 🎯 **Then Phase 2** - Next.js 15 migration
6. 🎯 **Test thoroughly**
7. 🎯 **Deploy when confident**

Let's begin! 🚀

