'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  Activity,
  Bell,
  Droplets,
  Leaf,
  Thermometer,
  TreeDeciduous,
  Wind,
  Layers,
  Map,
  Eye,
  FlaskConical,
  TrendingUp,
  Search,
  Target,
  Scan,
  Bot,
  MessageCircle,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { HealthGauge } from '@/components/habitat/health-gauge'
import { MetricCard } from '@/components/habitat/metric-card'
import { TrendsChart } from '@/components/habitat/trends-chart'
import { SpeciesList } from '@/components/habitat/species-list'
import { SoilProfile } from '@/components/habitat/soil-profile'
import { AlertsPanel } from '@/components/habitat/alerts-panel'
import { CalamitySimulator } from '@/components/habitat/calamity-simulator'
import { PredictionPanel } from '@/components/habitat/prediction-panel'
import { ForestLoader } from '@/components/habitat/forest-loader'
import { AIChat } from '@/components/habitat/ai-chat'
import { analyzeSector as analyzeSectorApi, getMonitoringData, getPredictions } from '@/lib/api'
import type { ApiResponse, Species } from '@/lib/types'
import type { AfforestationSite } from '@/components/habitat/map-canvas'
import { cn } from '@/lib/utils'

// Dynamically import map to avoid SSR issues with Leaflet
const MapCanvas = dynamic(
  () => import('@/components/habitat/map-canvas').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-card/50">
        <ForestLoader
          message="Initializing map..."
          className="h-full border-0 rounded-none"
        />
      </div>
    ),
  }
)

type Phase = 'planning' | 'monitoring' | 'simulation' | 'prediction'

const phases = [
  {
    id: 'planning' as const,
    label: 'Planning',
    icon: Map,
    description: 'Sector analysis & species selection',
  },
  {
    id: 'monitoring' as const,
    label: 'Monitoring',
    icon: Eye,
    description: 'Real-time ecosystem health',
  },
  {
    id: 'simulation' as const,
    label: 'Simulation',
    icon: FlaskConical,
    description: 'Calamity impact modeling',
  },
  {
    id: 'prediction' as const,
    label: 'Prediction',
    icon: TrendingUp,
    description: 'Future forecasts & risks',
  },
]

const mockApiResponse = {
  metrics: {
    health_score: 75,
    ndvi_current: 0.6,
    soil_ph: 6.5,
    lst_temp: 30,
    moisture_index: 50,
    aqi: 80,
    forest_cover: 40,
    carbon_sequestration: 10,
  },
  history: [],
  predictions: undefined,
  species: [],
  alerts: [],
  soilProfile: {
    ph: 0,
    nitrogen: 0,
    phosphorus: 0,
    potassium: 0,
    organicMatter: 0,
    texture: 'Unknown',
  },
}

export default function HabitatDashboard() {
  // Phase state
  const [activePhase, setActivePhase] = useState<Phase>('planning')

  // Query state - Default to center of India
  const [lat, setLat] = useState('20.5937')
  const [lng, setLng] = useState('78.9629')
  const [radius, setRadius] = useState('5')

  // Data state
  const [data, setData] = useState<ApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showSuitabilityOverlay, setShowSuitabilityOverlay] = useState(false)
  const [detectedSites, setDetectedSites] = useState<AfforestationSite[]>([])

  // Simulation state
  const [selectedSpecies, setSelectedSpecies] = useState<Species[]>([])
  const [predictionData, setPredictionData] = useState<any>(null)
  const [isPredictionLoading, setIsPredictionLoading] = useState(false)

  // Floating AI Chat state
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  // Fetch predictions
  const fetchPredictions = useCallback(async () => {
    setIsPredictionLoading(true)
    try {
      const predictions = await getPredictions({
        lat: parseFloat(lat) || 20.5937,
        lng: parseFloat(lng) || 78.9629,
        timelineMonths: 36,
        selectedSpecies: selectedSpecies.map(s => s.name),
      })
      setPredictionData(predictions)
    } catch (error) {
      console.error('Failed to fetch predictions:', error)
    }
    setIsPredictionLoading(false)
  }, [lat, lng, selectedSpecies])

  // Fetch monitoring data from API
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const monitoringData = await getMonitoringData({
        lat: parseFloat(lat) || 20.5937,
        lng: parseFloat(lng) || 78.9629,
      })
      setData({
        status: 'success',
        coordinates: {
          lat: parseFloat(lat) || 20.5937,
          lng: parseFloat(lng) || 78.9629,
        },
        ...monitoringData,
        species: [],
        soilProfile: {
          ph: 0,
          nitrogen: 0,
          phosphorus: 0,
          potassium: 0,
          organicMatter: 0,
          texture: 'Unknown',
        },
      })
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error)
      // Fallback to default data
      setData({
        status: 'success',
        coordinates: {
          lat: parseFloat(lat) || 20.5937,
          lng: parseFloat(lng) || 78.9629,
        },
        ...mockApiResponse,
      })
    }
    setIsLoading(false)
  }, [lat, lng])

  // Analyze sector (full heatmap analysis) using API
  const analyzeSector = useCallback(async () => {
    setIsAnalyzing(true)
    setShowSuitabilityOverlay(false)
    try {
      const analysisData = await analyzeSectorApi({
        lat: parseFloat(lat) || 20.5937,
        lng: parseFloat(lng) || 78.9629,
        radius: parseFloat(radius) || 5,
      })
      setData({
        status: 'success',
        coordinates: analysisData.coordinates,
        metrics: analysisData.metrics,
        history: analysisData.history,
        species: analysisData.species,
        soilProfile: analysisData.soilProfile,
        alerts: analysisData.alerts,
        ndviAnalysis: analysisData.ndviAnalysis,
      })
    } catch (error) {
      console.error('Sector analysis failed:', error)
    }
    setIsAnalyzing(false)
    setShowSuitabilityOverlay(true)
  }, [lat, lng, radius])

  // Handle sites detected from map
  const handleSitesDetected = useCallback((sites: AfforestationSite[]) => {
    setDetectedSites(sites)
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [])

  // Fetch predictions when entering prediction phase
  useEffect(() => {
    if (activePhase === 'prediction' && !isPredictionLoading && !predictionData) {
      fetchPredictions()
    }
  }, [activePhase, fetchPredictions, isPredictionLoading, predictionData])

  // Handle map click
  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(newLat.toFixed(6))
    setLng(newLng.toFixed(6))
  }

  // Calculate site stats
  const highPrioritySites = detectedSites.filter((s) => s.category === 'high')
  const mediumPrioritySites = detectedSites.filter(
    (s) => s.category === 'medium'
  )
  const totalSiteArea = detectedSites.reduce((sum, s) => sum + s.area, 0)

  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
              <TreeDeciduous className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Habitat</h1>
              <p className="text-xs text-muted-foreground">
                Adaptive Reforestation Platform
              </p>
            </div>
          </div>

          {/* Phase Tabs - Desktop */}
          <nav className="hidden lg:flex items-center gap-1 rounded-xl bg-muted/50 p-1">
            {phases.map((phase) => {
              const Icon = phase.icon
              const isActive = activePhase === phase.id
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setActivePhase(phase.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {phase.label}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-card/50 px-3 py-1.5 text-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">System Online</span>
            </div>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-card/50 transition-colors hover:bg-card"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {data && data.alerts.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-xs text-white">
                  {data.alerts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Phase Tabs - Mobile */}
        <div className="lg:hidden border-t border-border/50 px-4 py-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {phases.map((phase) => {
              const Icon = phase.icon
              const isActive = activePhase === phase.id
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setActivePhase(phase.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {phase.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Planning Phase */}
        {activePhase === 'planning' && (
          <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
            {/* Map Panel - Full width on left */}
            <div className="relative h-[50vh] lg:h-full w-full lg:flex-1">
              {isAnalyzing ? (
                <ForestLoader
                  message="Analyzing sector with NDVI + NDMI composite..."
                  className="h-full rounded-none border-0"
                />
              ) : (
                <MapCanvas
                  lat={parseFloat(lat) || 20.5937}
                  lng={parseFloat(lng) || 78.9629}
                  radius={parseFloat(radius) || 5}
                  onLocationClick={handleMapClick}
                  isAnalyzing={isAnalyzing}
                  showSuitabilityOverlay={showSuitabilityOverlay}
                  onAfforestationSitesDetected={handleSitesDetected}
                />
              )}
            </div>

            {/* Right Analysis Panel */}
            <div className="flex flex-col lg:w-[400px] xl:w-[440px] border-l border-border/50 bg-card/30">
              {/* Query Control Section */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Sector Analysis
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <Label
                      htmlFor="lat"
                      className="text-xs text-muted-foreground mb-1.5 block"
                    >
                      Latitude
                    </Label>
                    <Input
                      id="lat"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="h-9 font-mono text-sm bg-background/50"
                      placeholder="20.5937"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="lng"
                      className="text-xs text-muted-foreground mb-1.5 block"
                    >
                      Longitude
                    </Label>
                    <Input
                      id="lng"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="h-9 font-mono text-sm bg-background/50"
                      placeholder="78.9629"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="radius"
                      className="text-xs text-muted-foreground mb-1.5 block"
                    >
                      Radius (km)
                    </Label>
                    <Input
                      id="radius"
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      className="h-9 font-mono text-sm bg-background/50"
                      placeholder="5"
                    />
                  </div>
                </div>

                <Button
                  onClick={analyzeSector}
                  disabled={isLoading || isAnalyzing}
                  className="w-full gap-2"
                >
                  <Scan className="h-4 w-4" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Sector'}
                </Button>
              </div>

              {/* Analysis Results */}
              <div className="flex-1 overflow-y-auto">
                {showSuitabilityOverlay && detectedSites.length > 0 ? (
                  <div className="p-4 space-y-4">
                    {/* Key Sites Summary */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          <h4 className="text-sm font-semibold text-foreground">
                            Key Zones Identified
                          </h4>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/30"
                        >
                          {detectedSites.length} sites
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            High Priority
                          </p>
                          <p className="text-2xl font-semibold text-primary">
                            {highPrioritySites.length}
                          </p>
                          <Progress
                            value={
                              (highPrioritySites.length /
                                Math.max(detectedSites.length, 1)) *
                              100
                            }
                            className="h-1 mt-2"
                          />
                        </div>
                        <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            Medium Priority
                          </p>
                          <p className="text-2xl font-semibold text-foreground">
                            {mediumPrioritySites.length}
                          </p>
                          <Progress
                            value={
                              (mediumPrioritySites.length /
                                Math.max(detectedSites.length, 1)) *
                              100
                            }
                            className="h-1 mt-2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Analysis Metrics */}
                    <div className="rounded-lg border border-border/50 bg-background/50 p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3">
                        Analysis Metrics
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Total Suitable Area
                          </span>
                          <span className="font-mono text-sm text-foreground">
                            {totalSiteArea.toFixed(1)} ha
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Avg Suitability Score
                          </span>
                          <span className="font-mono text-sm text-primary">
                            {detectedSites.length > 0
                              ? (
                                  detectedSites.reduce(
                                    (sum, s) => sum + s.suitabilityScore,
                                    0
                                  ) / detectedSites.length
                                ).toFixed(0)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Avg NDVI (Barren Index)
                          </span>
                          <span className="font-mono text-sm text-amber-400">
                            {detectedSites.length > 0
                              ? (
                                  detectedSites.reduce(
                                    (sum, s) => sum + s.ndvi,
                                    0
                                  ) / detectedSites.length
                                ).toFixed(3)
                              : 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Avg NDMI (Moisture Index)
                          </span>
                          <span className="font-mono text-sm text-blue-400">
                            {detectedSites.length > 0
                              ? (
                                  detectedSites.reduce(
                                    (sum, s) => sum + s.ndmi,
                                    0
                                  ) / detectedSites.length
                                ).toFixed(3)
                              : 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Top Sites List */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">
                        Top Afforestation Sites
                      </h4>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {highPrioritySites.slice(0, 5).map((site, i) => (
                          <div
                            key={site.id}
                            className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                                {i + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Site {site.id.split('-').slice(1).join('-')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {site.area.toFixed(2)} ha
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary">
                                {site.suitabilityScore.toFixed(0)}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                NDMI: {site.ndmi.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Tabs for Species, Soil & AI Chat */}
                    <Tabs defaultValue="ai" className="mt-4">
                      <TabsList className="w-full bg-muted/50">
                        <TabsTrigger value="ai" className="flex-1 text-xs gap-1.5">
                          <Bot className="h-3 w-3" />
                          AI Chat
                        </TabsTrigger>
                        <TabsTrigger value="species" className="flex-1 text-xs">
                          Species
                        </TabsTrigger>
                        <TabsTrigger value="soil" className="flex-1 text-xs">
                          Soil
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="ai" className="mt-3">
                        <AIChat
                          initialLat={parseFloat(lat) || 20.5937}
                          initialLng={parseFloat(lng) || 78.9629}
                          className="h-[400px]"
                        />
                      </TabsContent>
                      <TabsContent value="species" className="mt-3">
                        <SpeciesList
                          species={data?.species ?? []}
                          isLoading={isLoading}
                          droughtSeverity={0}
                        />
                      </TabsContent>
                      <TabsContent value="soil" className="mt-3">
                        <SoilProfile
                          data={
                            data?.soilProfile ?? {
                              ph: 0,
                              nitrogen: 0,
                              phosphorus: 0,
                              potassium: 0,
                              organicMatter: 0,
                              texture: 'Unknown',
                            }
                          }
                          isLoading={isLoading}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  <div className="flex flex-col h-full p-4">
                    {/* Empty state message */}
                    <div className="flex flex-col items-center justify-center py-6 text-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                        <Scan className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h4 className="text-sm font-medium text-foreground mb-1">
                        No Analysis Yet
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-[200px]">
                        Click "Analyze Sector" above, or ask the AI assistant below.
                      </p>
                    </div>

                    {/* AI Chat available even without analysis */}
                    <div className="flex-1 min-h-0">
                      <AIChat
                        initialLat={parseFloat(lat) || 20.5937}
                        initialLng={parseFloat(lng) || 78.9629}
                        className="h-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Monitoring Phase */}
        {activePhase === 'monitoring' && (
          <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
            {/* Metrics Overview */}
            <div className="flex-1 overflow-y-auto p-4 lg:w-[50%]">
              <div className="space-y-4">
                {/* Health Score */}
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <HealthGauge
                    score={data?.metrics.health_score ?? 0}
                    isLoading={isLoading}
                  />
                </div>

                {/* Primary Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    title="NDVI Index"
                    value={data?.metrics.ndvi_current.toFixed(2) ?? '0'}
                    icon={Leaf}
                    isLoading={isLoading}
                    status={
                      (data?.metrics.ndvi_current ?? 0) > 0.5
                        ? 'healthy'
                        : (data?.metrics.ndvi_current ?? 0) > 0.3
                          ? 'warning'
                          : 'critical'
                    }
                    trend="up"
                    trendValue="+8%"
                  />
                  <MetricCard
                    title="Soil pH"
                    value={data?.metrics.soil_ph ?? '0'}
                    icon={Layers}
                    isLoading={isLoading}
                    status={
                      (data?.metrics.soil_ph ?? 0) >= 6 &&
                      (data?.metrics.soil_ph ?? 0) <= 7.5
                        ? 'healthy'
                        : 'warning'
                    }
                  />
                  <MetricCard
                    title="Temperature"
                    value={data?.metrics.lst_temp ?? '0'}
                    unit="°C"
                    icon={Thermometer}
                    isLoading={isLoading}
                    status={
                      (data?.metrics.lst_temp ?? 0) < 35
                        ? 'healthy'
                        : (data?.metrics.lst_temp ?? 0) < 40
                          ? 'warning'
                          : 'critical'
                    }
                  />
                  <MetricCard
                    title="Moisture"
                    value={data?.metrics.moisture_index ?? '0'}
                    unit="%"
                    icon={Droplets}
                    isLoading={isLoading}
                    status={
                      (data?.metrics.moisture_index ?? 0) > 40
                        ? 'healthy'
                        : (data?.metrics.moisture_index ?? 0) > 20
                          ? 'warning'
                          : 'critical'
                    }
                  />
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    title="AQI"
                    value={data?.metrics.aqi ?? '0'}
                    icon={Wind}
                    isLoading={isLoading}
                    status={
                      (data?.metrics.aqi ?? 0) < 100
                        ? 'healthy'
                        : (data?.metrics.aqi ?? 0) < 150
                          ? 'warning'
                          : 'critical'
                    }
                  />
                  <MetricCard
                    title="Forest Cover"
                    value={data?.metrics.forest_cover ?? '0'}
                    unit="%"
                    icon={TreeDeciduous}
                    isLoading={isLoading}
                    status={
                      (data?.metrics.forest_cover ?? 0) > 33
                        ? 'healthy'
                        : 'warning'
                    }
                  />
                  <MetricCard
                    title="Carbon Seq."
                    value={data?.metrics.carbon_sequestration ?? '0'}
                    unit="t/ha"
                    icon={Activity}
                    isLoading={isLoading}
                    status="healthy"
                  />
                </div>

                {/* Alerts */}
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    Active Alerts
                  </h3>
                  <AlertsPanel
                    alerts={data?.alerts ?? []}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Trends Panel */}
            <div className="flex-1 overflow-y-auto border-l border-border/50 p-4 lg:w-[50%]">
              <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                <h3 className="mb-4 text-sm font-semibold text-foreground">
                  Historical Trends (12 Months)
                </h3>
                <TrendsChart data={data?.history ?? []} isLoading={isLoading} />
              </div>
            </div>
          </div>
        )}

        {/* Simulation Phase */}
        {activePhase === 'simulation' && (
          <div className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Calamity Impact Simulator
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Model the effects of environmental disasters on your selected
                  species and metrics
                </p>
              </div>

              <CalamitySimulator
                species={data?.species ?? []}
                selectedSpecies={selectedSpecies}
                onSpeciesSelect={setSelectedSpecies}
              />
            </div>
          </div>
        )}

        {/* Prediction Phase */}
        {activePhase === 'prediction' && (
          <div className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Ecosystem Predictions
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI-powered forecasts based on historical data and current
                  conditions
                </p>
              </div>

              {isPredictionLoading ? (
                <ForestLoader
                  message="Generating predictions..."
                  className="min-h-[400px]"
                />
              ) : (
                <PredictionPanel
                  predictions={predictionData?.predictions ?? null}
                  timelineData={predictionData?.timelineData ?? null}
                  ecosystemBenefits={predictionData?.ecosystemBenefits ?? null}
                  isLoading={isPredictionLoading}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating AI Chat Button and Sheet */}
      <Sheet open={isAIChatOpen} onOpenChange={setIsAIChatOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className={cn(
              'fixed bottom-6 right-6 z-[100] h-14 w-14 rounded-full shadow-lg transition-all duration-300',
              'bg-emerald-600 hover:bg-emerald-500 hover:scale-105',
              'flex items-center justify-center',
              isAIChatOpen && 'scale-0 opacity-0'
            )}
            aria-label="Open AI Chat"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-md md:max-w-lg p-0 gap-0"
        >
          <SheetTitle className="sr-only">HABITAT AI Assistant</SheetTitle>
          <div className="flex flex-col h-full">
            <AIChat
              initialLat={parseFloat(lat) || 20.5937}
              initialLng={parseFloat(lng) || 78.9629}
              className="h-full border-0 rounded-none"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
