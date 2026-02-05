import { NextRequest, NextResponse } from 'next/server'
import {
  fetchSentinelData,
  fetchWeatherData,
  fetchSoilData,
  getSpeciesRecommendations,
  fetchDeforestationAlerts,
} from '@/lib/gis-tools'

const BACKEND_URL = process.env.BACKEND_URL

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lat, lng, radius } = body

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    // If external backend URL is configured, proxy the request
    if (BACKEND_URL) {
      const response = await fetch(`${BACKEND_URL}/api/sector/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radius }),
      })

      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`)
      }

      const data = await response.json()
      return NextResponse.json(data)
    }

    // Otherwise, use internal GIS tools to generate data with timeouts
    // Helper to wrap promises with timeout
    const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
      ])
    }

    // Default fallback values
    const defaultSatellite = {
      ndviAvg: 0.28,
      ndmiAvg: 0.15,
      suitabilityScore: 65,
      optimalZones: [
        { lat: lat + 0.005, lng: lng + 0.005, score: 78 },
        { lat: lat - 0.006, lng: lng + 0.004, score: 72 },
      ],
      rawData: [] as number[][],
    }
    
    const defaultWeather = {
      temperature: 28,
      humidity: 65,
      rainfall: 2.5,
      windSpeed: 12,
      conditions: 'partly cloudy',
      forecast: [{ date: new Date().toISOString().split('T')[0], temp: 28, rain: 2 }],
    }
    
    const defaultSoil = {
      ph: 6.5,
      nitrogen: 150,
      phosphorus: 30,
      potassium: 200,
      organicMatter: 3.0,
      texture: 'Loamy',
      drainage: 'Well-drained',
    }
    
    const defaultDeforestation = {
      totalAlerts: 0,
      recentAlerts: 0,
      alertsByMonth: [],
      hotspots: [] as Array<{ lat: number; lng: number; severity: string; date: string }>,
    }

    // Fetch all data in parallel with 12s timeout per request
    const [satelliteData, weatherData, soilData, deforestationData] =
      await Promise.all([
        withTimeout(fetchSentinelData(lat, lng, radius || 5), 12000, defaultSatellite),
        withTimeout(fetchWeatherData(lat, lng), 8000, defaultWeather),
        withTimeout(fetchSoilData(lat, lng), 10000, defaultSoil),
        withTimeout(fetchDeforestationAlerts(lat, lng, radius || 5), 10000, defaultDeforestation),
      ])

    // Get species recommendations based on collected data
    const speciesData = await getSpeciesRecommendations(
      {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        rainfall: weatherData.rainfall,
      },
      {
        ph: soilData.ph,
        nitrogen: soilData.nitrogen,
        organicMatter: soilData.organicMatter,
      },
      satelliteData.suitabilityScore
    )

    // Generate mock heatmap cells for visualization
    const cells = generateHeatmapCells(lat, lng, radius || 5)

    // Generate afforestation sites from satellite data
    const afforestationSites = satelliteData.optimalZones.map((zone, i) => ({
      id: `site-${lat.toFixed(3)}-${lng.toFixed(3)}-${i}`,
      lat: zone.lat,
      lng: zone.lng,
      ndvi: 0.2 + Math.random() * 0.15,
      ndmi: 0.1 + Math.random() * 0.3,
      suitabilityScore: zone.score,
      area: 5 + Math.random() * 20,
      category: zone.score >= 70 ? 'high' : zone.score >= 50 ? 'medium' : 'low' as const,
      bounds: generatePolygonBounds(zone.lat, zone.lng),
    }))

    // Build comprehensive response
    const response = {
      status: 'success',
      coordinates: { lat, lng },
      metrics: {
        health_score: Math.round(satelliteData.suitabilityScore * 0.8 + 20),
        ndvi_current: satelliteData.ndviAvg,
        soil_ph: soilData.ph,
        moisture_index: satelliteData.ndmiAvg * 100,
        lst_temp: weatherData.temperature,
        aqi: 50 + Math.floor(Math.random() * 50),
        forest_cover: 30 + Math.random() * 30,
        carbon_sequestration: 100 + Math.random() * 100,
      },
      history: generateHistoryData(),
      species: speciesData.map((s) => ({
        name: s.name,
        type: 'Native' as const,
        suitability: s.suitability,
        waterRequirement: s.waterRequirement as 'Low' | 'Medium' | 'High',
        carbonCapture: s.carbonCapture,
        description: s.notes,
        droughtTolerance: s.droughtTolerance,
        mineralSensitivity: 100 - s.droughtTolerance,
      })),
      soilProfile: {
        ph: soilData.ph,
        nitrogen: soilData.nitrogen,
        phosphorus: soilData.phosphorus,
        potassium: soilData.potassium,
        organicMatter: soilData.organicMatter,
        texture: soilData.texture,
      },
      alerts: generateAlerts(deforestationData, weatherData),
      ndviAnalysis: {
        cells,
        optimalZones: cells.filter((c) => c.composite > 0.6),
        affectedMetric: 'both' as const,
        correlationStrength: 0.75 + Math.random() * 0.2,
      },
      afforestationSites,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Sector analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze sector', details: String(error) },
      { status: 500 }
    )
  }
}

// Helper functions
function generateHeatmapCells(centerLat: number, centerLng: number, radius: number) {
  const cells = []
  const gridSize = 10
  const cellSpacing = (radius / 111.32) / gridSize

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = centerLat - (gridSize / 2) * cellSpacing + i * cellSpacing
      const lng = centerLng - (gridSize / 2) * cellSpacing + j * cellSpacing

      const distFromCenter = Math.sqrt(
        Math.pow(i - gridSize / 2, 2) + Math.pow(j - gridSize / 2, 2)
      )
      const baseNdvi = 0.7 - distFromCenter * 0.05 + Math.random() * 0.15
      const moisture = 50 - distFromCenter * 3 + Math.random() * 20
      const temperature = 30 + distFromCenter * 0.5 + Math.random() * 5

      const ndvi = Math.max(0.1, Math.min(0.9, baseNdvi))
      const moistureNorm = Math.max(10, Math.min(80, moisture))
      const temp = Math.max(25, Math.min(45, temperature))

      const composite = ndvi * 0.4 + (moistureNorm / 100) * 0.35 + (1 - (temp - 25) / 20) * 0.25

      cells.push({ lat, lng, ndvi, moisture: moistureNorm, temperature: temp, composite })
    }
  }

  return cells
}

function generatePolygonBounds(lat: number, lng: number) {
  const size = 0.005 + Math.random() * 0.01
  return [
    { lat: lat - size, lng: lng - size },
    { lat: lat - size, lng: lng + size },
    { lat: lat + size, lng: lng + size },
    { lat: lat + size, lng: lng - size },
  ]
}

function generateHistoryData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months.map((month, i) => ({
    month,
    ndvi: 0.3 + Math.sin((i / 12) * Math.PI * 2) * 0.2 + Math.random() * 0.1,
    rainfall: 50 + Math.sin(((i + 3) / 12) * Math.PI * 2) * 150 + Math.random() * 30,
    temperature: 25 + Math.sin((i / 12) * Math.PI * 2) * 8 + Math.random() * 3,
    moisture: 30 + Math.sin(((i + 3) / 12) * Math.PI * 2) * 25 + Math.random() * 10,
  }))
}

function generateAlerts(
  deforestationData: { recentAlerts: number; hotspots: Array<{ severity: string }> },
  weatherData: { temperature: number; rainfall: number }
) {
  const alerts = []

  if (deforestationData.recentAlerts > 10) {
    alerts.push({
      id: 'deforestation-1',
      type: 'critical' as const,
      message: `${deforestationData.recentAlerts} deforestation alerts detected in the last 30 days`,
      timestamp: new Date().toISOString(),
    })
  }

  if (weatherData.temperature > 35) {
    alerts.push({
      id: 'temp-1',
      type: 'warning' as const,
      message: `High temperature alert: ${weatherData.temperature.toFixed(1)}°C may stress vegetation`,
      timestamp: new Date().toISOString(),
    })
  }

  if (weatherData.rainfall < 1) {
    alerts.push({
      id: 'drought-1',
      type: 'warning' as const,
      message: 'Low rainfall conditions - consider irrigation planning',
      timestamp: new Date().toISOString(),
    })
  }

  alerts.push({
    id: 'info-1',
    type: 'info' as const,
    message: 'Optimal planting window: March 15 - April 30',
    timestamp: new Date().toISOString(),
  })

  return alerts
}
