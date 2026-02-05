import { NextRequest, NextResponse } from "next/server";
import {
  fetchWeatherData,
  fetchDeforestationAlerts,
  fetchSentinelData,
  fetchSoilData,
} from "@/lib/gis-tools";

const BACKEND_URL = process.env.BACKEND_URL;

// Health Score Calculation Weights
const HEALTH_WEIGHTS = {
  ndvi: 0.25, // Vegetation health (25%)
  moisture: 0.2, // Soil moisture (20%)
  temperature: 0.15, // Temperature stress (15%)
  aqi: 0.1, // Air quality (10%)
  forest_cover: 0.2, // Forest coverage (20%)
  soil_health: 0.1, // Soil pH balance (10%)
};

// Calculate ecosystem health score from metrics
function calculateHealthScore(metrics: {
  ndvi: number;
  moisture: number;
  temperature: number;
  aqi: number;
  forest_cover: number;
  soil_ph: number;
}): {
  score: number;
  breakdown: Record<
    string,
    { value: number; contribution: number; status: string }
  >;
} {
  const round = (num: number) => Math.round(num * 100) / 100;

  // NDVI score (0-1 scale, optimal 0.6-0.8)
  const ndviScore =
    metrics.ndvi >= 0.6
      ? 100
      : metrics.ndvi >= 0.4
      ? 70 + (metrics.ndvi - 0.4) * 150
      : metrics.ndvi * 175;

  // Moisture score (optimal 40-60%)
  const moistureScore =
    metrics.moisture >= 40 && metrics.moisture <= 60
      ? 100
      : metrics.moisture >= 25 && metrics.moisture <= 75
      ? 75
      : metrics.moisture >= 15 && metrics.moisture <= 85
      ? 50
      : 25;

  // Temperature score (optimal 20-30°C for most vegetation)
  const tempScore =
    metrics.temperature >= 20 && metrics.temperature <= 30
      ? 100
      : metrics.temperature >= 15 && metrics.temperature <= 35
      ? 75
      : metrics.temperature >= 10 && metrics.temperature <= 40
      ? 50
      : 25;

  // AQI score (lower is better, <50 is good)
  const aqiScore =
    metrics.aqi <= 50
      ? 100
      : metrics.aqi <= 100
      ? 80
      : metrics.aqi <= 150
      ? 50
      : 25;

  // Forest cover score (>33% is national target for India)
  const forestScore =
    metrics.forest_cover >= 33
      ? 60 + (metrics.forest_cover - 33) * 0.6
      : metrics.forest_cover * 1.8;

  // Soil pH score (optimal 6.0-7.5)
  const soilScore =
    metrics.soil_ph >= 6.0 && metrics.soil_ph <= 7.5
      ? 100
      : metrics.soil_ph >= 5.5 && metrics.soil_ph <= 8.0
      ? 70
      : 40;

  // Calculate weighted score
  const weightedScore =
    ndviScore * HEALTH_WEIGHTS.ndvi +
    moistureScore * HEALTH_WEIGHTS.moisture +
    tempScore * HEALTH_WEIGHTS.temperature +
    aqiScore * HEALTH_WEIGHTS.aqi +
    forestScore * HEALTH_WEIGHTS.forest_cover +
    soilScore * HEALTH_WEIGHTS.soil_health;

  const getStatus = (score: number) =>
    score >= 70 ? "good" : score >= 40 ? "moderate" : "poor";

  return {
    score: round(Math.min(100, Math.max(0, weightedScore))),
    breakdown: {
      vegetation: {
        value: round(metrics.ndvi),
        contribution: round(ndviScore * HEALTH_WEIGHTS.ndvi),
        status: getStatus(ndviScore),
      },
      moisture: {
        value: round(metrics.moisture),
        contribution: round(moistureScore * HEALTH_WEIGHTS.moisture),
        status: getStatus(moistureScore),
      },
      temperature: {
        value: round(metrics.temperature),
        contribution: round(tempScore * HEALTH_WEIGHTS.temperature),
        status: getStatus(tempScore),
      },
      air_quality: {
        value: round(metrics.aqi),
        contribution: round(aqiScore * HEALTH_WEIGHTS.aqi),
        status: getStatus(aqiScore),
      },
      forest_cover: {
        value: round(metrics.forest_cover),
        contribution: round(forestScore * HEALTH_WEIGHTS.forest_cover),
        status: getStatus(forestScore),
      },
      soil_health: {
        value: round(metrics.soil_ph),
        contribution: round(soilScore * HEALTH_WEIGHTS.soil_health),
        status: getStatus(soilScore),
      },
    },
  };
}

// Generate realistic historical data based on location and climate
function generateHistoryData(
  lat: number,
  weatherData: { temperature: number; humidity: number; rainfall?: number }
) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const round = (num: number) => Math.round(num * 100) / 100;

  const isSouthIndia = lat < 15;
  const isNorthIndia = lat > 25;
  const currentMonth = new Date().getMonth();

  const baseTemp = isSouthIndia ? 28 : isNorthIndia ? 22 : 25;
  const tempVariation = isSouthIndia ? 4 : isNorthIndia ? 15 : 10;
  const monsoonMonths = [5, 6, 7, 8];

  const currentTemp = weatherData.temperature;
  const currentHumidity = weatherData.humidity;

  return months.map((month, i) => {
    const monthOffset = (i - 5) / 6;
    const tempPattern = Math.cos(monthOffset * Math.PI);
    const temperature = round(baseTemp + tempPattern * tempVariation * 0.5);

    const isMonsoon = monsoonMonths.includes(i);
    const baseRainfall = isMonsoon ? 180 : i >= 10 || i <= 2 ? 15 : 40;
    const rainfall = round(
      baseRainfall + (Math.random() - 0.5) * baseRainfall * 0.4
    );

    const ndviBase = isMonsoon || i === 9 || i === 10 ? 0.55 : 0.35;
    const ndvi = round(ndviBase + (Math.random() - 0.5) * 0.15);

    const moistureBase = isMonsoon ? 60 : i >= 10 || i <= 2 ? 35 : 45;
    const moisture = round(moistureBase + (Math.random() - 0.5) * 15);

    if (i === currentMonth) {
      return {
        month,
        ndvi: round(0.4 + (currentHumidity / 100) * 0.3),
        rainfall: round(weatherData.rainfall || rainfall),
        temperature: round(currentTemp),
        moisture: round(currentHumidity * 0.7),
      };
    }

    return { month, ndvi, rainfall, temperature, moisture };
  });
}

function generateAlerts(
  deforestationData: { recentAlerts: number },
  weatherData: { temperature: number; rainfall: number; humidity: number },
  healthBreakdown: Record<string, { status: string }>
) {
  const alerts = [];

  if (deforestationData.recentAlerts > 5) {
    alerts.push({
      id: `deforestation-${Date.now()}`,
      type: "critical" as const,
      message: `${deforestationData.recentAlerts} deforestation alerts detected in last 30 days`,
      timestamp: new Date().toISOString(),
    });
  }

  if (weatherData.temperature > 38) {
    alerts.push({
      id: `temp-critical-${Date.now()}`,
      type: "critical" as const,
      message: `Extreme heat: ${weatherData.temperature.toFixed(
        1
      )}°C - High stress on vegetation`,
      timestamp: new Date().toISOString(),
    });
  } else if (weatherData.temperature > 35) {
    alerts.push({
      id: `temp-${Date.now()}`,
      type: "warning" as const,
      message: `High temperature: ${weatherData.temperature.toFixed(
        1
      )}°C - Monitor for heat stress`,
      timestamp: new Date().toISOString(),
    });
  }

  if (weatherData.humidity < 30) {
    alerts.push({
      id: `humidity-${Date.now()}`,
      type: "warning" as const,
      message: `Low humidity: ${weatherData.humidity}% - Increased fire risk`,
      timestamp: new Date().toISOString(),
    });
  }

  for (const [metric, data] of Object.entries(healthBreakdown)) {
    if (data.status === "poor") {
      alerts.push({
        id: `health-${metric}-${Date.now()}`,
        type: "warning" as const,
        message: `${metric
          .replace("_", " ")
          .toUpperCase()} is in poor condition`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      id: `info-${Date.now()}`,
      type: "info" as const,
      message: "All ecosystem indicators within normal range",
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

// Calculate risk advisory with species recommendations and solutions
function calculateRiskAdvisory(
  weatherData: { temperature: number; humidity: number; rainfall: number },
  soilData: { ph: number; nitrogen?: number },
  ndvi: number,
  moisture: number
): {
  risks: Array<{
    type: string;
    level: "low" | "moderate" | "high" | "critical";
    probability: number;
    description: string;
  }>;
  recommendedSpecies: Array<{
    name: string;
    reason: string;
    suitability: number;
  }>;
  solutions: Array<{
    title: string;
    description: string;
    priority: "immediate" | "short-term" | "long-term";
    category: "irrigation" | "soil" | "planting" | "protection";
  }>;
} {
  const risks: Array<{
    type: string;
    level: "low" | "moderate" | "high" | "critical";
    probability: number;
    description: string;
  }> = [];
  const recommendedSpecies: Array<{
    name: string;
    reason: string;
    suitability: number;
  }> = [];
  const solutions: Array<{
    title: string;
    description: string;
    priority: "immediate" | "short-term" | "long-term";
    category: "irrigation" | "soil" | "planting" | "protection";
  }> = [];

  // Calculate drought risk
  const droughtRisk = calculateDroughtRisk(weatherData, ndvi, moisture);
  if (droughtRisk.probability > 20) {
    risks.push({
      type: "drought",
      level:
        droughtRisk.probability > 70
          ? "critical"
          : droughtRisk.probability > 50
          ? "high"
          : droughtRisk.probability > 30
          ? "moderate"
          : "low",
      probability: droughtRisk.probability,
      description: droughtRisk.description,
    });
  }

  // Calculate flood risk
  const floodRisk = calculateFloodRisk(weatherData, moisture);
  if (floodRisk.probability > 20) {
    risks.push({
      type: "flood",
      level:
        floodRisk.probability > 70
          ? "critical"
          : floodRisk.probability > 50
          ? "high"
          : floodRisk.probability > 30
          ? "moderate"
          : "low",
      probability: floodRisk.probability,
      description: floodRisk.description,
    });
  }

  // Calculate heat stress risk
  const heatRisk = calculateHeatRisk(weatherData);
  if (heatRisk.probability > 20) {
    risks.push({
      type: "heat_stress",
      level:
        heatRisk.probability > 70
          ? "critical"
          : heatRisk.probability > 50
          ? "high"
          : heatRisk.probability > 30
          ? "moderate"
          : "low",
      probability: heatRisk.probability,
      description: heatRisk.description,
    });
  }

  // Get species recommendations based on conditions
  const speciesRecommendations = getSpeciesForConditions(
    weatherData,
    soilData,
    droughtRisk.probability,
    floodRisk.probability
  );
  recommendedSpecies.push(...speciesRecommendations);

  // Get solutions based on risks
  const solutionsForRisks = getSolutionsForRisks(risks, weatherData, moisture);
  solutions.push(...solutionsForRisks);

  return { risks, recommendedSpecies, solutions };
}

function calculateDroughtRisk(
  weather: { temperature: number; humidity: number; rainfall: number },
  ndvi: number,
  moisture: number
): { probability: number; description: string } {
  let risk = 0;
  const factors = [];

  // Low rainfall increases drought risk
  if (weather.rainfall < 2) {
    risk += 35;
    factors.push("very low precipitation");
  } else if (weather.rainfall < 5) {
    risk += 20;
    factors.push("low precipitation");
  }

  // High temperature increases drought risk
  if (weather.temperature > 38) {
    risk += 30;
    factors.push("extreme heat");
  } else if (weather.temperature > 33) {
    risk += 20;
    factors.push("high temperatures");
  }

  // Low humidity increases drought risk
  if (weather.humidity < 30) {
    risk += 25;
    factors.push("very low humidity");
  } else if (weather.humidity < 45) {
    risk += 15;
    factors.push("low humidity");
  }

  // Low moisture indicates ongoing stress
  if (moisture < 25) {
    risk += 20;
    factors.push("soil moisture deficit");
  } else if (moisture < 40) {
    risk += 10;
  }

  // Low NDVI indicates vegetation stress
  if (ndvi < 0.3) {
    risk += 15;
    factors.push("vegetation stress detected");
  }

  const probability = Math.min(100, Math.max(0, risk));
  const description =
    factors.length > 0
      ? `Drought conditions likely due to ${factors.join(", ")}`
      : "Normal conditions";

  return { probability, description };
}

function calculateFloodRisk(
  weather: { temperature: number; humidity: number; rainfall: number },
  moisture: number
): { probability: number; description: string } {
  let risk = 0;
  const factors = [];

  // High rainfall increases flood risk
  if (weather.rainfall > 50) {
    risk += 45;
    factors.push("heavy rainfall");
  } else if (weather.rainfall > 25) {
    risk += 25;
    factors.push("moderate to heavy rainfall");
  }

  // High humidity with rainfall
  if (weather.humidity > 85 && weather.rainfall > 10) {
    risk += 20;
    factors.push("saturated conditions");
  }

  // High existing moisture
  if (moisture > 80) {
    risk += 25;
    factors.push("waterlogged soil");
  } else if (moisture > 65) {
    risk += 10;
  }

  const probability = Math.min(100, Math.max(0, risk));
  const description =
    factors.length > 0
      ? `Flood risk elevated due to ${factors.join(", ")}`
      : "Normal conditions";

  return { probability, description };
}

function calculateHeatRisk(weather: {
  temperature: number;
  humidity: number;
}): { probability: number; description: string } {
  let risk = 0;
  const factors = [];

  if (weather.temperature > 42) {
    risk += 60;
    factors.push("extreme heat wave conditions");
  } else if (weather.temperature > 38) {
    risk += 40;
    factors.push("severe heat");
  } else if (weather.temperature > 35) {
    risk += 25;
    factors.push("high temperatures");
  }

  // Low humidity with high temp increases stress
  if (weather.temperature > 32 && weather.humidity < 40) {
    risk += 20;
    factors.push("dry heat stress");
  }

  const probability = Math.min(100, Math.max(0, risk));
  const description =
    factors.length > 0
      ? `Heat stress likely: ${factors.join(", ")}`
      : "Temperature within safe range";

  return { probability, description };
}

function getSpeciesForConditions(
  weather: { temperature: number; humidity: number; rainfall: number },
  soil: { ph: number; nitrogen?: number },
  droughtRisk: number,
  floodRisk: number
): Array<{ name: string; reason: string; suitability: number }> {
  const species = [];

  // Drought-resistant species for dry conditions
  if (droughtRisk > 40) {
    species.push(
      {
        name: "Neem (Azadirachta indica)",
        reason: "Extremely drought-tolerant, thrives in low rainfall",
        suitability: 95,
      },
      {
        name: "Khejri (Prosopis cineraria)",
        reason: "Desert species, minimal water needs",
        suitability: 92,
      },
      {
        name: "Babul (Acacia nilotica)",
        reason: "Drought-hardy, nitrogen-fixing",
        suitability: 88,
      }
    );
  }

  // Flood-tolerant species for wet conditions
  if (floodRisk > 40) {
    species.push(
      {
        name: "Arjun (Terminalia arjuna)",
        reason: "Riverbank species, tolerates waterlogging",
        suitability: 90,
      },
      {
        name: "Jamun (Syzygium cumini)",
        reason: "Thrives in moist conditions",
        suitability: 88,
      },
      {
        name: "Indian Willow (Salix tetrasperma)",
        reason: "Wetland adapted, prevents erosion",
        suitability: 85,
      }
    );
  }

  // Heat-tolerant species
  if (weather.temperature > 35) {
    species.push(
      {
        name: "Ber (Ziziphus mauritiana)",
        reason: "Heat-tolerant, fruit-bearing",
        suitability: 87,
      },
      {
        name: "Tamarind (Tamarindus indica)",
        reason: "Withstands high temperatures",
        suitability: 85,
      }
    );
  }

  // General species for moderate conditions
  if (species.length === 0) {
    species.push(
      {
        name: "Banyan (Ficus benghalensis)",
        reason: "Native, good carbon capture",
        suitability: 85,
      },
      {
        name: "Peepal (Ficus religiosa)",
        reason: "Hardy, excellent oxygen producer",
        suitability: 82,
      },
      {
        name: "Mango (Mangifera indica)",
        reason: "Fruit-bearing, moderate water needs",
        suitability: 80,
      }
    );
  }

  // Limit to top 5
  return species.slice(0, 5);
}

function getSolutionsForRisks(
  risks: Array<{ type: string; level: string; probability: number }>,
  weather: { temperature: number; humidity: number },
  moisture: number
): Array<{
  title: string;
  description: string;
  priority: "immediate" | "short-term" | "long-term";
  category: "irrigation" | "soil" | "planting" | "protection";
}> {
  const solutions: Array<{
    title: string;
    description: string;
    priority: "immediate" | "short-term" | "long-term";
    category: "irrigation" | "soil" | "planting" | "protection";
  }> = [];

  const droughtRisk = risks.find((r) => r.type === "drought");
  const floodRisk = risks.find((r) => r.type === "flood");
  const heatRisk = risks.find((r) => r.type === "heat_stress");

  // Drought solutions
  if (droughtRisk && droughtRisk.probability > 30) {
    solutions.push({
      title: "Install Drip Irrigation",
      description:
        "Set up drip irrigation system to deliver water directly to roots with 90% efficiency. Reduces water usage by 50-70% compared to flood irrigation.",
      priority: droughtRisk.probability > 60 ? "immediate" : "short-term",
      category: "irrigation",
    });
    solutions.push({
      title: "Apply Mulching",
      description:
        "Apply 3-4 inch layer of organic mulch (leaves, straw, wood chips) around plants to reduce evaporation by 25-50% and maintain soil moisture.",
      priority: "immediate",
      category: "soil",
    });
    solutions.push({
      title: "Rainwater Harvesting",
      description:
        "Install rainwater collection systems and check dams to capture monsoon water for dry season irrigation.",
      priority: "long-term",
      category: "irrigation",
    });
  }

  // Flood solutions
  if (floodRisk && floodRisk.probability > 30) {
    solutions.push({
      title: "Improve Drainage",
      description:
        "Create drainage channels and raised beds to prevent waterlogging. Install French drains in low-lying areas.",
      priority: floodRisk.probability > 60 ? "immediate" : "short-term",
      category: "soil",
    });
    solutions.push({
      title: "Plant on Mounds",
      description:
        "Create raised mounds (30-50cm) for planting to keep root zones above water level during floods.",
      priority: "short-term",
      category: "planting",
    });
  }

  // Heat stress solutions
  if (heatRisk && heatRisk.probability > 30) {
    solutions.push({
      title: "Install Shade Nets",
      description:
        "Use 50% shade cloth over saplings during peak summer to reduce temperature stress by 5-8°C.",
      priority: "immediate",
      category: "protection",
    });
    solutions.push({
      title: "Evening Watering",
      description:
        "Water plants in evening (5-7 PM) to reduce evaporation and allow overnight moisture absorption.",
      priority: "immediate",
      category: "irrigation",
    });
  }

  // General soil health
  if (moisture < 35) {
    solutions.push({
      title: "Add Organic Matter",
      description:
        "Incorporate compost or farmyard manure (5-10 tons/hectare) to improve soil water retention capacity.",
      priority: "short-term",
      category: "soil",
    });
  }

  // If no specific risks
  if (solutions.length === 0) {
    solutions.push({
      title: "Regular Monitoring",
      description:
        "Continue monitoring soil moisture and weather conditions. Current conditions are favorable for plant growth.",
      priority: "long-term",
      category: "protection",
    });
  }

  return solutions.slice(0, 6);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "20.5937");
    const lng = parseFloat(searchParams.get("lng") || "78.9629");

    if (BACKEND_URL) {
      const response = await fetch(
        `${BACKEND_URL}/api/monitoring?lat=${lat}&lng=${lng}`
      );
      if (!response.ok)
        throw new Error(`Backend error: ${response.statusText}`);
      return NextResponse.json(await response.json());
    }

    const round = (num: number) => Math.round(num * 100) / 100;

    const [weatherResult, deforestationResult, satelliteResult, soilResult] =
      await Promise.allSettled([
        fetchWeatherData(lat, lng),
        fetchDeforestationAlerts(lat, lng, 10),
        fetchSentinelData(lat, lng, 5),
        fetchSoilData(lat, lng),
      ]);

    const weatherData =
      weatherResult.status === "fulfilled"
        ? weatherResult.value
        : {
            temperature: 28,
            humidity: 65,
            rainfall: 2.5,
            windSpeed: 12,
            conditions: "partly cloudy",
            forecast: [],
          };

    const deforestationData =
      deforestationResult.status === "fulfilled"
        ? deforestationResult.value
        : {
            totalAlerts: 0,
            recentAlerts: 0,
            alertsByMonth: [],
            hotspots: [],
          };

    const satelliteData =
      satelliteResult.status === "fulfilled"
        ? satelliteResult.value
        : {
            ndviAvg: 0.55,
            ndmiAvg: 0.4,
            suitabilityScore: 65,
            optimalZones: [],
          };

    const soilData =
      soilResult.status === "fulfilled"
        ? soilResult.value
        : {
            ph: 6.5,
            nitrogen: 280,
            phosphorus: 45,
            potassium: 180,
            texture: "Loamy",
          };

    const ndvi = round(satelliteData.ndviAvg);
    const moisture = round(satelliteData.ndmiAvg * 100);
    const temperature = round(weatherData.temperature);
    const soilPh = round(soilData.ph);
    const aqi = round(
      weatherData.humidity > 70
        ? 60
        : weatherData.temperature > 35
        ? 90
        : 50 + Math.random() * 30
    );
    const forestCover = round(
      Math.min(70, Math.max(15, ndvi * 80 + (lat > 20 ? 10 : 20)))
    );
    const carbonSeq = round(forestCover * 2.5 + ndvi * 50);

    const { score: healthScore, breakdown: healthBreakdown } =
      calculateHealthScore({
        ndvi,
        moisture,
        temperature,
        aqi,
        forest_cover: forestCover,
        soil_ph: soilPh,
      });

    // Calculate risk advisory
    const riskAdvisory = calculateRiskAdvisory(
      weatherData,
      soilData,
      ndvi,
      moisture
    );

    return NextResponse.json({
      metrics: {
        health_score: healthScore,
        ndvi_current: ndvi,
        soil_ph: soilPh,
        moisture_index: moisture,
        lst_temp: temperature,
        aqi,
        forest_cover: forestCover,
        carbon_sequestration: carbonSeq,
      },
      health_breakdown: healthBreakdown,
      health_calculation: {
        formula: "Weighted average of 6 ecosystem indicators",
        weights: HEALTH_WEIGHTS,
        description:
          "Health Score = (NDVI×25%) + (Moisture×20%) + (Temperature×15%) + (AQI×10%) + (Forest Cover×20%) + (Soil Health×10%)",
      },
      risk_advisory: riskAdvisory,
      history: generateHistoryData(lat, weatherData),
      alerts: generateAlerts(deforestationData, weatherData, healthBreakdown),
      data_sources: {
        weather:
          weatherResult.status === "fulfilled"
            ? "OpenWeather API"
            : "Fallback estimates",
        satellite:
          satelliteResult.status === "fulfilled"
            ? "Sentinel Hub"
            : "Statistical model",
        soil:
          soilResult.status === "fulfilled"
            ? "SoilGrids API"
            : "Regional averages",
        deforestation:
          deforestationResult.status === "fulfilled"
            ? "Global Forest Watch"
            : "Historical data",
      },
    });
  } catch (error) {
    console.error("Monitoring data error:", error);

    const fallbackMetrics = {
      ndvi: 0.55,
      moisture: 50,
      temperature: 28,
      aqi: 70,
      forest_cover: 40,
      soil_ph: 6.5,
    };
    const { score, breakdown } = calculateHealthScore(fallbackMetrics);

    // Fallback risk advisory
    const fallbackRiskAdvisory = calculateRiskAdvisory(
      { temperature: 28, humidity: 65, rainfall: 2.5 },
      { ph: 6.5, nitrogen: 280 },
      fallbackMetrics.ndvi,
      fallbackMetrics.moisture
    );

    return NextResponse.json({
      metrics: {
        health_score: score,
        ndvi_current: fallbackMetrics.ndvi,
        soil_ph: fallbackMetrics.soil_ph,
        moisture_index: fallbackMetrics.moisture,
        lst_temp: fallbackMetrics.temperature,
        aqi: fallbackMetrics.aqi,
        forest_cover: fallbackMetrics.forest_cover,
        carbon_sequestration: 120,
      },
      health_breakdown: breakdown,
      health_calculation: {
        formula: "Weighted average of 6 ecosystem indicators",
        weights: HEALTH_WEIGHTS,
        description:
          "Health Score = (NDVI×25%) + (Moisture×20%) + (Temperature×15%) + (AQI×10%) + (Forest Cover×20%) + (Soil Health×10%)",
      },
      risk_advisory: fallbackRiskAdvisory,
      history: generateHistoryData(20.5937, {
        temperature: 28,
        humidity: 65,
        rainfall: 2.5,
      }),
      alerts: [
        {
          id: `info-${Date.now()}`,
          type: "info" as const,
          message:
            "Using simulated data - configure API keys for real-time monitoring",
          timestamp: new Date().toISOString(),
        },
      ],
      data_sources: {
        weather: "Fallback",
        satellite: "Statistical model",
        soil: "Regional averages",
        deforestation: "Historical",
      },
    });
  }
}
