# 🔧 Next Improvements & Enhancements

**Current File**: `lib/api-clients.ts` (Open in editor)  
**Status**: Ready for integration

---

## 📊 Current Architecture

### What You Have Now

**Two Approaches for API Calls:**

1. **Direct Implementation** (Currently Used)
   - Location: `lib/services/*.ts`
   - Each service directly calls external APIs
   - Example: `weather.ts`, `soil.ts`, `ndvi.ts`
   - ✅ Simple and straightforward
   - ⚠️ Some code duplication

2. **Centralized API Clients** (Available, Not Used Yet)
   - Location: `lib/api-clients.ts` ← **YOU ARE HERE**
   - Reusable API client objects
   - ✅ DRY (Don't Repeat Yourself)
   - ✅ Easier to test and mock
   - ⚠️ Needs integration

---

## 🎯 Recommended Next Steps

### Option A: Refactor to Use API Clients (Recommended)

**Why?**
- Cleaner code organization
- Easier to test
- Better error handling
- Centralized configuration

**How?**

1. **Update Weather Service**
```typescript
// lib/services/weather.ts
import { weatherApi } from '@/lib/api-clients';

export async function fetchWeatherData(lat: number, lon: number) {
  try {
    const data = await weatherApi.getCurrentWeather(lat, lon);
    return {
      temp: Math.round(data.main.temp * 10) / 10,
      humidity: data.main.humidity,
      rainfall: data.rain?.['1h'] || 0,
      wind: Math.round(data.wind.speed * 10) / 10,
      conditions: data.weather[0]?.description || 'unknown',
      pressure: data.main.pressure,
      visibility: data.visibility / 1000
    };
  } catch (error) {
    console.error('Weather fetch failed:', error);
    throw error;
  }
}
```

2. **Update Soil Service**
```typescript
// lib/services/soil.ts
import { soilGridsApi } from '@/lib/api-clients';

export async function fetchSoilData(lat: number, lon: number) {
  try {
    const data = await soilGridsApi.getSoilProperties(lat, lon);
    // Process and return
    return processSoilData(data);
  } catch (error) {
    console.error('Soil fetch failed:', error);
    throw error;
  }
}
```

3. **Update NDVI Service**
```typescript
// lib/services/ndvi.ts
import { sentinelApi } from '@/lib/api-clients';

export async function fetchNDVIData(bbox: number[], date: string) {
  try {
    const token = await sentinelApi.getAccessToken();
    const blob = await sentinelApi.getNDVI(bbox, date, token);
    return processNDVIBlob(blob);
  } catch (error) {
    console.error('NDVI fetch failed:', error);
    throw error;
  }
}
```

### Option B: Keep Current Implementation

**Why?**
- Already working
- No refactoring needed
- Focus on features instead

**What to do:**
- Delete or ignore `api-clients.ts`
- Continue building features
- Refactor later if needed

---

## 🚀 Feature Enhancements

### 1. Add More Indian Forest Zones

**File**: `public/data/india-forest-zones.json`

Add more zones:
```json
{
  "type": "Feature",
  "properties": {
    "name": "Sundarbans Mangrove Forest",
    "state": "West Bengal",
    "area_km2": 4262,
    "health_status": "amber",
    "dominant_species": ["Heritiera fomes", "Excoecaria agallocha"],
    "threats": ["Rising sea levels", "Cyclones", "Salinity"]
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [...]
  }
}
```

### 2. Improve Species Recommendations

**File**: `lib/services/species.ts`

Add more Indian native species:
```typescript
const INDIAN_NATIVE_SPECIES = [
  {
    name: 'Neem',
    scientific: 'Azadirachta indica',
    climate: ['tropical', 'subtropical'],
    soil: ['loamy', 'sandy'],
    rainfall: [400, 1200],
    benefits: ['medicinal', 'pest-control', 'shade']
  },
  {
    name: 'Peepal',
    scientific: 'Ficus religiosa',
    climate: ['tropical', 'subtropical'],
    soil: ['loamy', 'clayey'],
    rainfall: [500, 2500],
    benefits: ['oxygen', 'sacred', 'shade']
  },
  // Add more...
];
```

### 3. Enhanced Calamity Simulations

**File**: `components/habitat/calamity-simulator.tsx`

Add more calamity types:
```typescript
const CALAMITY_TYPES = [
  { id: 'drought', name: 'Drought', icon: '☀️' },
  { id: 'flood', name: 'Flood', icon: '🌊' },
  { id: 'wildfire', name: 'Wildfire', icon: '🔥' },
  { id: 'cyclone', name: 'Cyclone', icon: '🌀' },
  { id: 'landslide', name: 'Landslide', icon: '⛰️' },
  { id: 'pest', name: 'Pest Outbreak', icon: '🐛' },
  { id: 'disease', name: 'Tree Disease', icon: '🦠' }
];
```

### 4. Real-time Monitoring Dashboard

**New File**: `components/habitat/real-time-monitor.tsx`

```typescript
export function RealTimeMonitor() {
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    // Poll for updates every 30 seconds
    const interval = setInterval(async () => {
      const data = await fetch('/api/monitoring');
      const json = await data.json();
      setAlerts(json.alerts);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="space-y-4">
      {alerts.map(alert => (
        <Alert key={alert.id} variant={alert.severity}>
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

### 5. Historical Data Analysis

**New File**: `lib/services/historical.ts`

```typescript
export async function fetchHistoricalNDVI(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
) {
  // Fetch NDVI time series
  // Calculate trends
  // Detect anomalies
  return {
    timeSeries: [...],
    trend: 'increasing',
    anomalies: [...]
  };
}
```

### 6. Export Reports

**New File**: `app/api/report/export/route.ts`

```typescript
export async function POST(request: Request) {
  const data = await request.json();
  
  // Generate PDF report
  const pdf = await generatePDFReport(data);
  
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="restoration-report.pdf"'
    }
  });
}
```

---

## 🧪 Testing Improvements

### Add Unit Tests

**New File**: `lib/services/__tests__/weather.test.ts`

```typescript
import { fetchWeatherData } from '../weather';

describe('Weather Service', () => {
  it('should fetch weather data', async () => {
    const data = await fetchWeatherData(19.076, 72.878);
    expect(data).toHaveProperty('temp');
    expect(data).toHaveProperty('humidity');
  });
  
  it('should handle API errors', async () => {
    await expect(
      fetchWeatherData(999, 999)
    ).rejects.toThrow();
  });
});
```

### Add Integration Tests

**New File**: `app/api/__tests__/sector.test.ts`

```typescript
import { POST } from '../sector/analyze/route';

describe('Sector Analysis API', () => {
  it('should analyze a sector', async () => {
    const request = new Request('http://localhost:3000/api/sector/analyze', {
      method: 'POST',
      body: JSON.stringify({ lat: 19.076, lng: 72.878, radius: 5 })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(data).toHaveProperty('suitability');
    expect(data).toHaveProperty('sites');
  });
});
```

---

## 🔒 Security Enhancements

### 1. Add Rate Limiting

**File**: `lib/rate-limit.ts` (Already exists)

Use it in API routes:
```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  if (!rateLimit.check(ip)) {
    return new Response('Too many requests', { status: 429 });
  }
  
  // Process request...
}
```

### 2. Add Input Validation

**New File**: `lib/validation.ts`

```typescript
import { z } from 'zod';

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180)
});

export const sectorAnalysisSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(1).max(50)
});
```

Use in API routes:
```typescript
import { sectorAnalysisSchema } from '@/lib/validation';

export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const validated = sectorAnalysisSchema.parse(body);
    // Process validated data...
  } catch (error) {
    return new Response('Invalid input', { status: 400 });
  }
}
```

### 3. Add API Key Rotation

**File**: `lib/env.ts`

```typescript
export const env = {
  // Support multiple API keys for rotation
  openWeatherApiKeys: (
    process.env.OPENWEATHER_API_KEYS || 
    process.env.OPENWEATHER_API_KEY || 
    ''
  ).split(','),
  
  // Rotate through keys
  getOpenWeatherKey: () => {
    const keys = env.openWeatherApiKeys.filter(k => k);
    if (keys.length === 0) return '';
    const index = Math.floor(Math.random() * keys.length);
    return keys[index];
  }
};
```

---

## 📊 Performance Optimizations

### 1. Add Redis Caching

```bash
npm install @upstash/redis
```

**File**: `lib/cache.ts` (Already exists)

Enhance it:
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!
});

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  // Try cache first
  const cached = await redis.get<T>(key);
  if (cached) return cached;
  
  // Fetch and cache
  const data = await fetcher();
  await redis.set(key, data, { ex: ttl });
  return data;
}
```

### 2. Add Request Deduplication

**File**: `lib/dedupe.ts`

```typescript
const pending = new Map<string, Promise<any>>();

export async function dedupe<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (pending.has(key)) {
    return pending.get(key)!;
  }
  
  const promise = fetcher().finally(() => {
    pending.delete(key);
  });
  
  pending.set(key, promise);
  return promise;
}
```

### 3. Add Parallel Processing

**File**: `lib/services/dataService.ts`

Already implemented! But can be enhanced:
```typescript
export async function fetchRestorationData(lat: number, lon: number) {
  // Parallel fetch with timeout
  const results = await Promise.allSettled([
    Promise.race([
      fetchWeather(lat, lon),
      timeout(5000, 'Weather timeout')
    ]),
    Promise.race([
      fetchSoil(lat, lon),
      timeout(5000, 'Soil timeout')
    ]),
    // ... more
  ]);
  
  return processResults(results);
}
```

---

## 🎨 UI/UX Enhancements

### 1. Add Loading States

**File**: `components/habitat/map-canvas.tsx`

```typescript
{isAnalyzing && (
  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
    <div className="text-center space-y-4">
      <Spinner className="w-12 h-12" />
      <p className="text-sm text-muted-foreground">
        Analyzing sector...
      </p>
    </div>
  </div>
)}
```

### 2. Add Toast Notifications

Already have Sonner! Use it more:
```typescript
import { toast } from 'sonner';

// Success
toast.success('Analysis complete!', {
  description: 'Found 5 suitable afforestation sites'
});

// Error
toast.error('Analysis failed', {
  description: error.message
});

// Loading
const toastId = toast.loading('Analyzing sector...');
// Later...
toast.success('Complete!', { id: toastId });
```

### 3. Add Keyboard Shortcuts

**File**: `hooks/use-keyboard-shortcuts.ts`

```typescript
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        // Open command palette
      }
      if (e.key === 'Escape') {
        // Close modals
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
```

---

## 📱 Mobile Optimization

### 1. Responsive Map

**File**: `components/habitat/map-canvas.tsx`

```typescript
const isMobile = useMediaQuery('(max-width: 768px)');

<MapContainer
  zoom={isMobile ? 4 : 5}
  minZoom={isMobile ? 3 : 4}
  maxZoom={isMobile ? 16 : 18}
>
```

### 2. Touch Gestures

```typescript
const [touchStart, setTouchStart] = useState(0);

const handleTouchStart = (e: TouchEvent) => {
  setTouchStart(e.touches[0].clientX);
};

const handleTouchEnd = (e: TouchEvent) => {
  const touchEnd = e.changedTouches[0].clientX;
  const diff = touchStart - touchEnd;
  
  if (Math.abs(diff) > 50) {
    // Swipe detected
    if (diff > 0) {
      // Swipe left
    } else {
      // Swipe right
    }
  }
};
```

---

## 🎯 Priority Recommendations

### High Priority (Do First)
1. ✅ Create `.env` file with API keys
2. ✅ Test the app: `npm run dev`
3. ✅ Verify all features work
4. 📝 Add more Indian forest zones
5. 📝 Improve species database

### Medium Priority (Do Next)
1. 🔧 Refactor to use api-clients (optional)
2. 🧪 Add unit tests
3. 🔒 Add input validation
4. 📊 Add Redis caching
5. 🎨 Improve loading states

### Low Priority (Nice to Have)
1. 📱 Mobile optimization
2. ⌨️ Keyboard shortcuts
3. 📄 PDF report export
4. 📈 Historical data analysis
5. 🔄 Real-time WebSocket updates

---

## ✅ Decision Time

**What do you want to do next?**

### A. Start Using the App
- Create `.env` file
- Run `npm run dev`
- Test features
- **→ Read: START_NOW.md**

### B. Refactor to Use API Clients
- Update service files
- Use centralized clients
- Better code organization
- **→ Start with weather.ts**

### C. Add New Features
- More forest zones
- Better species data
- Enhanced simulations
- **→ Pick from list above**

### D. Improve Testing
- Add unit tests
- Add integration tests
- Better error handling
- **→ Create __tests__ folders**

---

**Your call! What sounds most interesting?** 🚀
