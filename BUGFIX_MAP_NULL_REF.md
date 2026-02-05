# 🐛 Bug Fix: Map Null Reference Error

**Date**: February 5, 2026  
**Status**: ✅ Fixed

---

## Problem

**Error Message:**
```
TypeError: Cannot read properties of null (reading 'removeLayer')
at MapCanvas.useCallback[loadSuitabilityOverlay] (components/habitat/map-canvas.tsx:752:22)
```

**Root Cause:**
The `loadSuitabilityOverlay` function is async and fetches data from an API. Between the initial null check and the async operation completing, the map component could be unmounted, causing `mapRef.current` to become null.

---

## Timeline of Events

```
1. Function starts → mapRef.current exists ✅
2. Check: if (!mapRef.current) return ✅
3. Fetch data (async) → Takes 1-2 seconds ⏳
4. [User navigates away or component unmounts] ❌
5. mapRef.current becomes null ❌
6. Try to call mapRef.current.removeLayer() 💥 ERROR
```

---

## Solution

Added an additional null check **after** the async operation completes:

### Before (Broken)
```typescript
const loadSuitabilityOverlay = useCallback(async () => {
  if (!mapRef.current) return  // ✅ Initial check

  const bbox = calculateBBox(lat, lng, radius * 1000)

  // Async operation - takes time
  const { imageUrl, sites } = await fetchAfforestationSuitability(bbox)
  
  // ❌ No check here - mapRef.current might be null now!
  if (overlayLayerRef.current) {
    mapRef.current.removeLayer(overlayLayerRef.current)  // 💥 ERROR
  }
}, [lat, lng, radius])
```

### After (Fixed)
```typescript
const loadSuitabilityOverlay = useCallback(async () => {
  if (!mapRef.current) return  // ✅ Initial check

  const bbox = calculateBBox(lat, lng, radius * 1000)

  // Async operation - takes time
  const { imageUrl, sites } = await fetchAfforestationSuitability(bbox)
  
  // ✅ Check again after async operation
  if (!mapRef.current) return
  
  // Now safe to use mapRef.current
  if (overlayLayerRef.current) {
    mapRef.current.removeLayer(overlayLayerRef.current)  // ✅ Safe
  }
}, [lat, lng, radius])
```

---

## Changes Made

### File: `components/habitat/map-canvas.tsx`

**Line ~750**: Added null check after async operation
```typescript
// Check if map still exists after async operation
if (!mapRef.current) return
```

**Line ~830**: Added null check before creating group layer
```typescript
if (highQualitySites.length > 0 && mapRef.current) {
  // Safe to use mapRef.current
}
```

---

## Why This Happens

### Common Scenarios
1. **User navigates away** while data is loading
2. **Component unmounts** during async operation
3. **Parent component re-renders** and unmounts child
4. **Route change** before data fetch completes

### React Lifecycle
```
Mount → Render → Async Start → [Unmount] → Async Complete
                                    ↑
                              mapRef becomes null
```

---

## Best Practices for Async Operations in React

### 1. Always Check Refs After Async
```typescript
const myAsyncFunction = useCallback(async () => {
  if (!myRef.current) return  // Before async
  
  const data = await fetchData()
  
  if (!myRef.current) return  // After async ✅
  
  myRef.current.doSomething(data)
}, [])
```

### 2. Use Cleanup Functions
```typescript
useEffect(() => {
  let mounted = true
  
  async function load() {
    const data = await fetchData()
    if (mounted) {
      // Safe to update state
    }
  }
  
  load()
  
  return () => {
    mounted = false  // Cleanup
  }
}, [])
```

### 3. Use AbortController for Fetch
```typescript
useEffect(() => {
  const controller = new AbortController()
  
  async function load() {
    try {
      const data = await fetch(url, { signal: controller.signal })
      // Process data
    } catch (error) {
      if (error.name === 'AbortError') {
        // Fetch was cancelled
      }
    }
  }
  
  load()
  
  return () => controller.abort()
}, [])
```

---

## Testing

### How to Reproduce (Before Fix)
1. Open the app
2. Click "Analyze Sector"
3. Immediately navigate away or close the panel
4. Error would occur

### Verification (After Fix)
1. Open the app
2. Click "Analyze Sector"
3. Immediately navigate away
4. ✅ No error - gracefully handles unmount

---

## Related Issues

### Other Places to Check
Look for similar patterns in:
- `components/habitat/ai-chat.tsx` - Async AI responses
- `components/habitat/simulation-dock.tsx` - Async simulations
- `app/page.tsx` - Async data fetching

### Pattern to Search For
```typescript
// ⚠️ Potential issue
async function myFunction() {
  const data = await fetch()
  someRef.current.doSomething()  // Might be null!
}
```

---

## Prevention

### ESLint Rule (Optional)
Add to `.eslintrc.json`:
```json
{
  "rules": {
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-non-null-assertion": "error"
  }
}
```

### TypeScript Strict Mode
Enable in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true
  }
}
```

---

## Impact

### Before Fix
- ❌ App crashes when navigating during analysis
- ❌ Poor user experience
- ❌ Console errors

### After Fix
- ✅ Graceful handling of unmounts
- ✅ No crashes
- ✅ Better user experience

---

## Lessons Learned

1. **Always validate refs after async operations**
2. **Component lifecycle matters in async code**
3. **User actions can happen anytime**
4. **Defensive programming prevents crashes**

---

**Status**: ✅ Fixed and tested  
**Files Modified**: 1  
**Lines Changed**: 2  
**Impact**: High (prevents crashes)

