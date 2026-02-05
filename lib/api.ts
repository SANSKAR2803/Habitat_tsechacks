import type {
  ApiResponse,
  Metrics,
  HistoryEntry,
  Species,
  SoilProfile,
  Alert,
  HeatmapCell,
  PredictionData,
  SimulationResult,
  CalamityScenario,
  RiskAdvisory,
} from "./types";

// Backend URL from environment variable - defaults to relative API routes
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// SECTOR ANALYSIS API
// ============================================

export interface SectorAnalysisRequest {
  lat: number;
  lng: number;
  radius: number;
}

export interface SectorAnalysisResponse {
  status: "success" | "error";
  coordinates: { lat: number; lng: number };
  metrics: Metrics;
  history: HistoryEntry[];
  species: Species[];
  soilProfile: SoilProfile;
  alerts: Alert[];
  ndviAnalysis: {
    cells: HeatmapCell[];
    optimalZones: HeatmapCell[];
    affectedMetric: "moisture" | "temperature" | "both";
    correlationStrength: number;
  };
  afforestationSites: AfforestationSiteData[];
}

export interface AfforestationSiteData {
  id: string;
  lat: number;
  lng: number;
  ndvi: number;
  ndmi: number;
  suitabilityScore: number;
  area: number;
  category: "high" | "medium" | "low";
  bounds: Array<{ lat: number; lng: number }>;
}

export async function analyzeSector(
  params: SectorAnalysisRequest
): Promise<SectorAnalysisResponse> {
  return apiRequest<SectorAnalysisResponse>("/api/sector/analyze", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ============================================
// MONITORING API
// ============================================

export interface MonitoringDataRequest {
  lat: number;
  lng: number;
}

export interface HealthBreakdownItem {
  value: number;
  contribution: number;
  status: string;
}

export interface MonitoringDataResponse {
  metrics: Metrics;
  history: HistoryEntry[];
  alerts: Alert[];
  health_breakdown?: {
    vegetation?: HealthBreakdownItem;
    moisture?: HealthBreakdownItem;
    temperature?: HealthBreakdownItem;
    air_quality?: HealthBreakdownItem;
    forest_cover?: HealthBreakdownItem;
    soil_health?: HealthBreakdownItem;
  };
  health_calculation?: {
    formula: string;
    weights: Record<string, number>;
    description: string;
  };
  risk_advisory?: RiskAdvisory;
  data_sources?: Record<string, string>;
}

export async function getMonitoringData(
  params: MonitoringDataRequest
): Promise<MonitoringDataResponse> {
  return apiRequest<MonitoringDataResponse>(
    `/api/monitoring?lat=${params.lat}&lng=${params.lng}`
  );
}

// ============================================
// SPECIES API
// ============================================

export interface SpeciesRecommendationRequest {
  lat: number;
  lng: number;
  soilPh: number;
  temperature: number;
  rainfall: number;
}

export interface SpeciesRecommendationResponse {
  species: Species[];
}

export async function getSpeciesRecommendations(
  params: SpeciesRecommendationRequest
): Promise<SpeciesRecommendationResponse> {
  return apiRequest<SpeciesRecommendationResponse>("/api/species/recommend", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ============================================
// SOIL PROFILE API
// ============================================

export interface SoilProfileRequest {
  lat: number;
  lng: number;
}

export interface SoilProfileResponse {
  soilProfile: SoilProfile;
}

export async function getSoilProfile(
  params: SoilProfileRequest
): Promise<SoilProfileResponse> {
  return apiRequest<SoilProfileResponse>(
    `/api/soil?lat=${params.lat}&lng=${params.lng}`
  );
}

// ============================================
// SIMULATION API
// ============================================

export interface SimulationRequest {
  scenario: CalamityScenario;
  selectedSpecies: string[];
  lat: number;
  lng: number;
}

export async function runSimulation(
  params: SimulationRequest
): Promise<SimulationResult> {
  return apiRequest<SimulationResult>("/api/simulation/run", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ============================================
// PREDICTION API
// ============================================

export interface PredictionRequest {
  lat: number;
  lng: number;
  timelineMonths: number;
  selectedSpecies?: string[];
}

export interface PredictionResponse {
  predictions: PredictionData[];
  timelineData: {
    month: number;
    waterRetention: number;
    aqiImprovement: number;
    temperatureReduction: number;
    carbonSequestration: number;
    treeMaturity: number;
  }[];
  ecosystemBenefits: {
    category: string;
    value: number;
    percentage: number;
  }[];
}

export async function getPredictions(
  params: PredictionRequest
): Promise<PredictionResponse> {
  return apiRequest<PredictionResponse>("/api/predictions", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ============================================
// WEATHER API
// ============================================

export interface WeatherDataRequest {
  lat: number;
  lng: number;
}

export interface WeatherDataResponse {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  conditions: string;
  forecast: Array<{ date: string; temp: number; rain: number }>;
}

export async function getWeatherData(
  params: WeatherDataRequest
): Promise<WeatherDataResponse> {
  return apiRequest<WeatherDataResponse>(
    `/api/weather?lat=${params.lat}&lng=${params.lng}`
  );
}

// ============================================
// DEFORESTATION ALERTS API
// ============================================

export interface DeforestationAlertsRequest {
  lat: number;
  lng: number;
  radius: number;
}

export interface DeforestationAlertsResponse {
  totalAlerts: number;
  recentAlerts: number;
  alertsByMonth: Array<{ month: string; count: number }>;
  hotspots: Array<{ lat: number; lng: number; severity: string; date: string }>;
}

export async function getDeforestationAlerts(
  params: DeforestationAlertsRequest
): Promise<DeforestationAlertsResponse> {
  return apiRequest<DeforestationAlertsResponse>(
    `/api/deforestation?lat=${params.lat}&lng=${params.lng}&radius=${params.radius}`
  );
}

// ============================================
// SATELLITE DATA API (NDVI/NDMI)
// ============================================

export interface SatelliteDataRequest {
  lat: number;
  lng: number;
  radius: number;
}

export interface SatelliteDataResponse {
  ndviAvg: number;
  ndmiAvg: number;
  suitabilityScore: number;
  optimalZones: Array<{ lat: number; lng: number; score: number }>;
  heatmapImageUrl?: string;
}

export async function getSatelliteData(
  params: SatelliteDataRequest
): Promise<SatelliteDataResponse> {
  return apiRequest<SatelliteDataResponse>("/api/satellite", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
