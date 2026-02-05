import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  fetchSentinelData,
  fetchWeatherData,
  fetchDeforestationAlerts,
  getSpeciesRecommendations,
  calculateEcosystemImpact,
} from '@/lib/gis-tools'
import { fetchSoilProfile, fetchLegacySoilData } from '@/lib/services/soil'
import {
  getSpeciesDetails as getSpeciesDetailsFromDB,
  getSpeciesForCondition,
  SPECIES_DATABASE,
} from '@/lib/species-database'

// Initialize AI clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const googleApiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY
const genAI = googleApiKey ? new GoogleGenerativeAI(googleApiKey) : null
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'

// GIS Expert Agent System Prompt
const SYSTEM_PROMPT = `You are HABITAT-AI, an expert Geospatial Intelligence Agent specialized in adaptive reforestation and ecosystem restoration. You have deep knowledge in:

1. **Remote Sensing & Satellite Analysis**: Interpreting NDVI, NDMI, and other vegetation indices from Sentinel-2 imagery to identify optimal afforestation sites.

2. **Climate & Weather Analysis**: Understanding how temperature, humidity, rainfall patterns, and seasonal variations affect tree growth and forest health.

3. **Soil Science**: Analyzing soil pH, NPK levels, organic matter content, texture, and drainage to recommend suitable species.

4. **Forest Ecology**: Knowledge of native and adaptive species, their growth patterns, carbon sequestration potential, and ecosystem services.

5. **Conservation & Sustainability**: Understanding deforestation patterns, biodiversity corridors, and sustainable land management practices.

6. **Comprehensive Species Database**: You have access to detailed information on 16 tree species including:
   - Native species: Teak, Neem, Banyan, Peepal, Bamboo, Sandalwood, Indian Rosewood, Sal
   - Fruit trees: Mango, Jamun, Amla, Tamarind
   - Others: Eucalyptus, Acacia, Casuarina, Gulmohar
   - For each species: stress tolerance (drought, flood, salinity, heat, cold, pollution), environmental effects (carbon sequestration, air purification, soil improvement, water retention, biodiversity support), native regions, and ideal conditions.

**Your Communication Style:**
- Be precise and data-driven, always referencing actual metrics when available
- Explain complex geospatial concepts in accessible terms
- Proactively suggest analyses when you identify gaps in understanding
- Provide actionable recommendations backed by scientific reasoning
- When uncertain, clearly state limitations and suggest additional data collection

**Tool Usage Guidelines:**
- Use the satellite analysis tool to assess land suitability before making planting recommendations
- Always check weather data to understand current conditions
- Cross-reference deforestation alerts to identify at-risk areas
- Combine soil and climate data for comprehensive species recommendations
- Use getSpeciesDetails to provide in-depth information about specific species
- Use getSpeciesByCondition to find species that thrive under specific stress conditions

When users ask about a location, always gather comprehensive data using your tools before providing recommendations. When discussing species, leverage the comprehensive species database to provide detailed information about stress tolerance, environmental benefits, and ideal growing conditions.`

// Tool definitions
const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'analyzeSatellite',
      description: 'Analyze satellite imagery to identify optimal afforestation sites using NDVI and NDMI indices. Use this when the user wants to assess land suitability for planting.',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Latitude of the center point' },
          longitude: { type: 'number', description: 'Longitude of the center point' },
          radiusKm: { type: 'number', description: 'Radius in kilometers to analyze', default: 5 },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getWeather',
      description: 'Get current weather conditions and 5-day forecast for a location. Use this to understand climate conditions affecting tree growth.',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Latitude' },
          longitude: { type: 'number', description: 'Longitude' },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkDeforestation',
      description: 'Check for recent deforestation alerts in an area using Global Forest Watch data. Use this to identify at-risk areas or assess historical forest loss.',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Latitude' },
          longitude: { type: 'number', description: 'Longitude' },
          radiusKm: { type: 'number', description: 'Radius in kilometers', default: 10 },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyzeSoil',
      description: 'Analyze comprehensive soil profile using SoilGrids API (ISRIC). Returns texture class, drainage, pH, nutrients (nitrogen, organic carbon), CEC, bulk density, water retention, fertility rating, soil health score, and actionable recommendations. Use this to understand soil suitability before recommending tree species.',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Latitude' },
          longitude: { type: 'number', description: 'Longitude' },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recommendSpecies',
      description: 'Get species recommendations based on climate and soil conditions. Use this after gathering weather and soil data to suggest appropriate tree species.',
      parameters: {
        type: 'object',
        properties: {
          temperature: { type: 'number', description: 'Average temperature in Celsius' },
          humidity: { type: 'number', description: 'Average humidity percentage' },
          annualRainfall: { type: 'number', description: 'Estimated annual rainfall in mm' },
          soilPh: { type: 'number', description: 'Soil pH value' },
          soilNitrogen: { type: 'number', description: 'Soil nitrogen in mg/kg' },
          organicMatter: { type: 'number', description: 'Organic matter percentage' },
          suitabilityScore: { type: 'number', description: 'Site suitability score from satellite analysis', default: 50 },
        },
        required: ['temperature', 'humidity', 'annualRainfall', 'soilPh', 'soilNitrogen', 'organicMatter'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'predictImpact',
      description: 'Calculate predicted ecosystem impact of reforestation over time. Use this to show potential benefits of planting.',
      parameters: {
        type: 'object',
        properties: {
          areaHectares: { type: 'number', description: 'Area to be planted in hectares' },
          speciesList: { type: 'array', items: { type: 'string' }, description: 'List of species to be planted' },
          timelineYears: { type: 'number', description: 'Projection timeline in years', default: 10 },
        },
        required: ['areaHectares', 'speciesList'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getSpeciesDetails',
      description: 'Get detailed information about a specific tree species including stress tolerance, environmental effects, and optimal growing conditions. Use this when users ask about a specific species.',
      parameters: {
        type: 'object',
        properties: {
          speciesName: { type: 'string', description: 'Common name or scientific name of the species (e.g., "Neem", "Quercus robur")' },
        },
        required: ['speciesName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getSpeciesByCondition',
      description: 'Get list of species that are well-suited for specific challenging conditions. Use this when the user has specific constraints like drought, flooding, frost, urban pollution, or poor soil.',
      parameters: {
        type: 'object',
        properties: {
          condition: { 
            type: 'string', 
            enum: ['drought', 'flood', 'frost', 'urban', 'poor_soil'],
            description: 'The challenging condition to filter species by' 
          },
        },
        required: ['condition'],
      },
    },
  },
]

// Tool execution function with improved error handling
async function executeTool(toolName: string, args: Record<string, unknown>) {
  console.log(`[Tool Execution] Starting ${toolName} with args:`, JSON.stringify(args))
  
  try {
    switch (toolName) {
      case 'analyzeSatellite': {
        const { latitude, longitude, radiusKm = 5 } = args as { latitude: number; longitude: number; radiusKm?: number }
        
        if (!latitude || !longitude) {
          throw new Error('Missing required parameters: latitude and longitude')
        }
        
        console.log(`[Tool] Fetching satellite data for ${latitude}, ${longitude}`)
        const data = await fetchSentinelData(latitude, longitude, radiusKm)
        
        return {
          success: true,
          analysis: {
            averageNDVI: data.ndviAvg.toFixed(3),
            averageNDMI: data.ndmiAvg.toFixed(3),
            suitabilityScore: data.suitabilityScore.toFixed(1),
            interpretation:
              data.suitabilityScore > 60
                ? 'High potential for afforestation'
                : data.suitabilityScore > 40
                  ? 'Moderate potential - may need soil amendments'
                  : 'Low potential - consider alternative interventions',
            optimalZones: data.optimalZones.slice(0, 5).map((z) => ({
              coordinates: `${z.lat.toFixed(4)}, ${z.lng.toFixed(4)}`,
              score: z.score.toFixed(1),
            })),
          },
        }
      }

      case 'getWeather': {
        const { latitude, longitude } = args as { latitude: number; longitude: number }
        
        if (!latitude || !longitude) {
          throw new Error('Missing required parameters: latitude and longitude')
        }
        
        console.log(`[Tool] Fetching weather data for ${latitude}, ${longitude}`)
        const weather = await fetchWeatherData(latitude, longitude)
        
        return {
          success: true,
          current: {
            temperature: `${weather.temperature.toFixed(1)}°C`,
            humidity: `${weather.humidity}%`,
            rainfall: `${weather.rainfall} mm`,
            windSpeed: `${weather.windSpeed} m/s`,
            conditions: weather.conditions,
          },
          forecast: weather.forecast.slice(0, 5).map((f) => ({
            date: f.date,
            temperature: `${f.temp.toFixed(1)}°C`,
            expectedRain: `${f.rain.toFixed(1)} mm`,
          })),
          assessment:
            weather.humidity > 60 && weather.temperature > 20
              ? 'Favorable conditions for planting'
              : weather.humidity < 40
                ? 'Dry conditions - irrigation may be needed'
                : 'Monitor conditions before planting',
        }
      }

      case 'checkDeforestation': {
        const { latitude, longitude, radiusKm = 10 } = args as { latitude: number; longitude: number; radiusKm?: number }
        
        if (!latitude || !longitude) {
          throw new Error('Missing required parameters: latitude and longitude')
        }
        
        console.log(`[Tool] Checking deforestation for ${latitude}, ${longitude}`)
        const alerts = await fetchDeforestationAlerts(latitude, longitude, radiusKm)
        
        return {
          success: true,
          summary: {
            totalAlertsLastYear: alerts.totalAlerts,
            alertsLast30Days: alerts.recentAlerts,
            trend:
              alerts.recentAlerts > alerts.totalAlerts / 12
                ? 'Increasing deforestation activity'
                : 'Stable or declining activity',
          },
          monthlyBreakdown: alerts.alertsByMonth.slice(0, 6),
          hotspots: alerts.hotspots.slice(0, 5).map((h) => ({
            location: `${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}`,
            severity: h.severity,
            date: h.date,
          })),
          recommendation:
            alerts.recentAlerts > 10
              ? 'High priority area - consider immediate intervention and monitoring'
              : 'Monitor regularly - establish baseline before planting',
        }
      }

      case 'analyzeSoil': {
        const { latitude, longitude } = args as { latitude: number; longitude: number }
        
        if (!latitude || !longitude) {
          throw new Error('Missing required parameters: latitude and longitude')
        }
        
        console.log(`[Tool] Analyzing soil profile for ${latitude}, ${longitude}`)
        
        try {
          // Use comprehensive SoilGrids profile
          const profile = await fetchSoilProfile(latitude, longitude)
          const topLayer = profile.layers[0]
          const organicMatter = topLayer.organicCarbon * 1.724
          
          return {
            success: true,
            source: 'SoilGrids (ISRIC)',
            location: profile.location,
            textureClass: profile.textureClass,
            drainageClass: profile.drainageClass,
            fertilityRating: profile.fertilityRating,
            properties: {
              pH: topLayer.pH.toFixed(1),
              clay: `${topLayer.clay.toFixed(1)}%`,
              sand: `${topLayer.sand.toFixed(1)}%`,
              silt: `${topLayer.silt.toFixed(1)}%`,
              nitrogen: `${(topLayer.nitrogen * 1000).toFixed(0)} mg/kg`,
              organicMatter: `${organicMatter.toFixed(1)}%`,
              organicCarbon: `${topLayer.organicCarbon.toFixed(1)} g/kg`,
              cec: `${topLayer.cec.toFixed(1)} cmol/kg`,
              bulkDensity: `${topLayer.bulkDensity.toFixed(2)} g/cm³`,
              coarseFragments: `${topLayer.coarseFragments.toFixed(1)}%`,
            },
            waterRetention: {
              fieldCapacity: `${topLayer.waterRetention.fieldCapacity.toFixed(1)}%`,
              wiltingPoint: `${topLayer.waterRetention.wiltingPoint.toFixed(1)}%`,
              availableWater: `${topLayer.waterRetention.availableWater.toFixed(1)}%`,
            },
            depthProfile: profile.layers.map(l => ({
              depth: l.depth,
              pH: l.pH.toFixed(1),
              organicCarbon: `${l.organicCarbon.toFixed(1)} g/kg`,
              clay: `${l.clay.toFixed(0)}%`,
            })),
            soilHealthScore: profile.summary.soilHealthScore,
            assessment: {
              phStatus:
                topLayer.pH >= 6.0 && topLayer.pH <= 7.5
                  ? 'Optimal - suitable for most tree species'
                  : topLayer.pH < 6.0
                    ? 'Acidic - consider lime application or acid-tolerant species'
                    : 'Alkaline - select species tolerant of high pH',
              textureAssessment: profile.textureClass.includes('Loam')
                ? 'Ideal loamy texture - good water and nutrient retention'
                : profile.textureClass.includes('Sand')
                  ? 'Sandy soil - fast drainage, may need irrigation'
                  : profile.textureClass.includes('Clay')
                    ? 'Clay-rich - high nutrient retention but may compact'
                    : 'Mixed texture - evaluate specific needs',
              drainageAssessment: profile.drainageClass.includes('Well')
                ? 'Good drainage - suitable for most species'
                : profile.drainageClass.includes('Poor')
                  ? 'Poor drainage - select flood-tolerant species or improve drainage'
                  : 'Moderate drainage - monitor during wet seasons',
              fertilityAssessment: `${profile.fertilityRating} fertility - ${profile.fertilityRating === 'Very High' || profile.fertilityRating === 'High' ? 'excellent for tree establishment' : profile.fertilityRating === 'Moderate' ? 'adequate with supplementation' : 'requires soil amendments'}`,
            },
            recommendations: profile.summary.recommendations,
          }
        } catch (error) {
          // Fallback to legacy format if comprehensive fails
          console.warn('Falling back to legacy soil data:', error)
          const soil = await fetchLegacySoilData(latitude, longitude)
          
          return {
            success: true,
            source: 'SoilGrids (ISRIC) - Basic',
            properties: {
              pH: soil.ph.toFixed(1),
              nitrogen: `${soil.nitrogen.toFixed(0)} mg/kg`,
              phosphorus: `${soil.phosphorus.toFixed(0)} mg/kg (estimated)`,
              potassium: `${soil.potassium.toFixed(0)} mg/kg (estimated)`,
              organicMatter: `${soil.organicMatter.toFixed(1)}%`,
              texture: soil.texture,
              drainage: soil.drainage,
            },
            assessment: {
              phStatus:
                soil.ph >= 6.0 && soil.ph <= 7.5
                  ? 'Optimal for most species'
                  : soil.ph < 6.0
                    ? 'Acidic - consider lime application'
                    : 'Alkaline - may limit species selection',
              fertilityStatus:
                soil.nitrogen > 100
                  ? 'Good nitrogen levels'
                  : 'May need nitrogen supplementation',
              overallSuitability:
                soil.organicMatter > 2 ? 'Good' : 'May benefit from composting',
            },
          }
        }
      }

      case 'recommendSpecies': {
        const { temperature, humidity, annualRainfall, soilPh, soilNitrogen, organicMatter, suitabilityScore = 50 } = args as {
          temperature: number
          humidity: number
          annualRainfall: number
          soilPh: number
          soilNitrogen: number
          organicMatter: number
          suitabilityScore?: number
        }
        
        if (!temperature || !humidity || !annualRainfall || !soilPh || !soilNitrogen || organicMatter === undefined) {
          throw new Error('Missing required parameters for species recommendation')
        }
        
        console.log(`[Tool] Recommending species for temp:${temperature}, humidity:${humidity}`)
        const recommendations = await getSpeciesRecommendations(
          { temperature, humidity, rainfall: annualRainfall / 365 },
          { ph: soilPh, nitrogen: soilNitrogen, organicMatter },
          suitabilityScore
        )
        
        return {
          success: true,
          topRecommendations: recommendations.slice(0, 6).map((s) => ({
            name: s.name,
            scientificName: s.scientificName,
            suitabilityScore: `${s.suitability}%`,
            climaticRegion: s.climaticRegion || 'Various',
            waterRequirement: s.waterRequirement,
            carbonCapture: `${s.carbonCapture} tons/hectare/year`,
            growthRate: s.growthRate,
            stressTolerance: {
              drought: `${s.droughtTolerance}%`,
              flood: s.floodTolerance ? `${s.floodTolerance}%` : 'N/A',
              airPollution: s.aqiTolerance ? `${s.aqiTolerance}%` : 'N/A',
            },
            environmentalBenefits: s.environmentalEffects ? {
              carbonSequestration: s.environmentalEffects.carbon_sequestration,
              soilImprovement: s.environmentalEffects.soil_profile,
              waterCycle: s.environmentalEffects.water_cycle,
              maturationImpact: s.environmentalEffects.maturation_impact,
            } : null,
            notes: s.notes,
          })),
          totalSpeciesAnalyzed: recommendations.length,
          plantingStrategy:
            recommendations[0]?.suitability > 70
              ? 'Conditions favorable for direct planting'
              : 'Consider nursery establishment first',
          recommendation: recommendations[0]?.suitability > 80 
            ? `${recommendations[0].name} is an excellent match for these conditions with ${recommendations[0].suitability}% suitability.`
            : recommendations[0]?.suitability > 60
              ? `${recommendations[0].name} is a good option. Consider mixing with ${recommendations[1]?.name || 'companion species'} for better ecosystem resilience.`
              : 'Consider site preparation or amendments before planting to improve success rates.',
        }
      }

      case 'predictImpact': {
        const { areaHectares, speciesList, timelineYears = 10 } = args as {
          areaHectares: number
          speciesList: string[]
          timelineYears?: number
        }
        
        if (!areaHectares || !speciesList || speciesList.length === 0) {
          throw new Error('Missing required parameters: areaHectares and speciesList')
        }
        
        console.log(`[Tool] Predicting impact for ${areaHectares} hectares over ${timelineYears} years`)
        const impact = await calculateEcosystemImpact(areaHectares, speciesList, timelineYears)
        
        return {
          success: true,
          projectedImpact: {
            carbonSequestration: `${impact.carbonSequestration} tons CO₂`,
            waterRetentionImprovement: `${impact.waterRetention}%`,
            biodiversityScore: `${impact.biodiversityScore}/100`,
            localTemperatureReduction: `${impact.temperatureReduction}°C`,
            airQualityImprovement: `${impact.aqiImprovement}% AQI reduction`,
          },
          soilBenefits: impact.soilImprovement || 'General soil improvement from organic matter accumulation.',
          speciesContributions: impact.speciesBreakdown?.map(s => ({
            species: s.name,
            carbonContribution: `${s.carbonContribution} tons CO₂`,
            keyBenefits: s.specialBenefits,
          })) || [],
          timeline: `${timelineYears} years`,
          milestones: {
            year1to3: 'Establishment phase - focus on survival and root development',
            year3to7: 'Growth acceleration - canopy formation begins',
            year7to15: 'Maturation - significant ecosystem services begin',
            year15plus: 'Full maturity - maximum carbon capture and biodiversity support',
          },
          summary: `Planting ${areaHectares} hectares with ${speciesList.join(', ')} could sequester ${impact.carbonSequestration} tons of CO₂ over ${timelineYears} years while improving local water retention by ${impact.waterRetention}% and biodiversity by ${impact.biodiversityScore}/100.`,
        }
      }

      case 'getSpeciesDetails': {
        const { speciesName } = args as { speciesName: string }
        
        if (!speciesName) {
          throw new Error('Missing required parameter: speciesName')
        }
        
        console.log(`[Tool] Getting details for species: ${speciesName}`)
        const species = getSpeciesDetailsFromDB(speciesName)
        
        if (!species) {
          // Return available species list
          return {
            success: false,
            error: `Species "${speciesName}" not found in database.`,
            availableSpecies: SPECIES_DATABASE.map(s => ({
              commonName: s.common_name,
              scientificName: s.scientific_name,
            })),
            suggestion: 'Try one of the available species listed above, or use the recommendSpecies tool for site-specific recommendations.',
          }
        }
        
        return {
          success: true,
          species: {
            commonName: species.common_name,
            scientificName: species.scientific_name,
            climaticRegion: species.climatic_region,
            stressTolerance: {
              drought: species.stress_tolerance.drought,
              flood: species.stress_tolerance.flood,
              frost: species.stress_tolerance.frost,
              airPollution: species.stress_tolerance.high_aqi,
              poorSoil: species.stress_tolerance.nutrient_depletion,
            },
            environmentalBenefits: {
              carbonSequestration: species.environmental_effects.carbon_sequestration,
              soilImprovement: species.environmental_effects.soil_profile,
              waterCycle: species.environmental_effects.water_cycle,
              airQuality: species.environmental_effects.air_quality,
              maturationImpact: species.environmental_effects.maturation_impact,
            },
          },
        }
      }

      case 'getSpeciesByCondition': {
        const { condition } = args as { condition: 'drought' | 'flood' | 'frost' | 'urban' | 'poor_soil' }
        
        if (!condition) {
          throw new Error('Missing required parameter: condition')
        }
        
        console.log(`[Tool] Getting species for condition: ${condition}`)
        const species = getSpeciesForCondition(condition)
        
        const conditionLabels: Record<string, string> = {
          drought: 'drought-tolerant',
          flood: 'flood-tolerant',
          frost: 'frost-hardy',
          urban: 'urban/pollution-tolerant',
          poor_soil: 'poor soil-adapted',
        }
        
        return {
          success: true,
          condition: conditionLabels[condition] || condition,
          speciesCount: species.length,
          recommendedSpecies: species.map(s => ({
            commonName: s.common_name,
            scientificName: s.scientific_name,
            climaticRegion: s.climatic_region,
            relevantTolerance: condition === 'drought' ? s.stress_tolerance.drought
              : condition === 'flood' ? s.stress_tolerance.flood
              : condition === 'frost' ? s.stress_tolerance.frost
              : condition === 'urban' ? s.stress_tolerance.high_aqi
              : s.stress_tolerance.nutrient_depletion,
            keyBenefit: s.environmental_effects.maturation_impact.split('.')[0],
          })),
          plantingAdvice: condition === 'drought' 
            ? 'For drought-prone areas, focus on deep-rooted species and consider mulching to retain soil moisture.'
            : condition === 'flood'
              ? 'For flood-prone areas, select species that can tolerate waterlogging and have adapted root systems.'
              : condition === 'frost'
                ? 'For frost-prone areas, ensure species are cold-hardy and consider microclimate protection for saplings.'
                : condition === 'urban'
                  ? 'For urban areas with high pollution, prioritize species that actively filter air pollutants and tolerate compacted soils.'
                  : 'For poor soil areas, nitrogen-fixing species and those that build organic matter are ideal pioneers.',
        }
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  } catch (error) {
    console.error(`[Tool Execution] Error in ${toolName}:`, error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if any AI provider is configured
    if (!openai && !genAI) {
      // Return a helpful message instead of error
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          const helpMessage = {
            type: 'text',
            text: `👋 Hi! I'm HABITAT-AI, your GIS Expert Agent.

⚠️ **AI Chat Not Configured**

To enable AI-powered chat, you need to add an API key:

**Option 1: OpenAI (Recommended)**
1. Get API key: https://platform.openai.com/api-keys
2. Add to \`.env.local\`: \`OPENAI_API_KEY=sk-your-key\`

**Option 2: Google Gemini (Free Alternative)**
1. Get API key: https://makersuite.google.com/app/apikey
2. Add to \`.env.local\`: \`GOOGLE_AI_API_KEY=your-key\`
3. Add to \`.env.local\`: \`AI_PROVIDER=gemini\`

**For now, you can:**
- ✅ Use the map to explore Indian forest zones
- ✅ Click "Analyze Sector" to get satellite analysis
- ✅ View species recommendations and metrics
- ✅ Run calamity simulations

Restart the dev server after adding API keys!`,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(helpMessage)}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Use OpenAI by default
    if (AI_PROVIDER === 'openai' && openai) {
      return await handleOpenAIChat(messages)
    } else if (AI_PROVIDER === 'gemini' && genAI) {
      return await handleGeminiChat(messages)
    } else if (openai) {
      // Fallback to OpenAI if available
      return await handleOpenAIChat(messages)
    } else if (genAI) {
      // Fallback to Gemini if available
      return await handleGeminiChat(messages)
    } else {
      throw new Error('No AI provider available')
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function handleOpenAIChat(messages: Array<{ role: string; parts: Array<{ type: string; text: string }> }>) {
  if (!openai) {
    throw new Error('OpenAI not configured')
  }

  console.log('[AI Chat] Starting OpenAI chat with', messages.length, 'messages')

  // Convert messages to OpenAI format
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((msg): OpenAI.Chat.ChatCompletionMessageParam => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.parts?.map(p => p.text).join('') || '',
    })),
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let chatMessages = [...openaiMessages]
        let iterations = 0
        const maxIterations = 10
        let hasStreamedContent = false

        console.log('[AI Chat] Starting tool calling loop')

        while (iterations < maxIterations) {
          iterations++
          console.log(`[AI Chat] Iteration ${iterations}/${maxIterations}`)

          try {
            const response = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: chatMessages,
              tools,
              tool_choice: 'auto', // Let the model decide when to use tools
              temperature: 0.7,
              max_tokens: 2000,
            })

            const choice = response.choices[0]
            
            if (!choice || !choice.message) {
              console.error('[AI Chat] No choice or message in response')
              break
            }

            console.log('[AI Chat] Response finish_reason:', choice.finish_reason)
            console.log('[AI Chat] Has content:', !!choice.message.content)
            console.log('[AI Chat] Has tool_calls:', !!choice.message.tool_calls)

            // Handle tool calls FIRST - don't stream preliminary content if there are tool calls
            // This ensures the agent gathers data before responding
            if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
              console.log(`[AI Chat] Processing ${choice.message.tool_calls.length} tool calls (skipping preliminary text)`)
              
              // Add assistant message with tool calls to history (but don't stream its content yet)
              chatMessages.push(choice.message)

              // Execute each tool call
              for (const toolCall of choice.message.tool_calls) {
                const toolName = toolCall.function.name
                let args: Record<string, unknown>
                
                try {
                  args = JSON.parse(toolCall.function.arguments)
                  console.log(`[AI Chat] Tool: ${toolName}, Args:`, args)
                } catch (parseError) {
                  console.error(`[AI Chat] Failed to parse tool arguments:`, toolCall.function.arguments)
                  args = {}
                }

                // Stream tool invocation notification
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool-invocation',
                  toolName,
                  args,
                })}\n\n`))

                try {
                  console.log(`[AI Chat] Executing tool: ${toolName}`)
                  const result = await executeTool(toolName, args)
                  console.log(`[AI Chat] Tool ${toolName} succeeded`)

                  // Stream tool result
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'tool-result',
                    toolName,
                    result,
                  })}\n\n`))

                  // Add tool result to chat history
                  chatMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result),
                  })
                } catch (toolError) {
                  console.error(`[AI Chat] Tool execution error for ${toolName}:`, toolError)
                  
                  const errorResult = {
                    success: false,
                    error: toolError instanceof Error ? toolError.message : 'Unknown error',
                    message: `Failed to execute ${toolName}. Using fallback data.`
                  }

                  // Stream error result
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'tool-result',
                    toolName,
                    result: errorResult,
                  })}\n\n`))

                  // Add error to chat history so AI can handle it
                  chatMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(errorResult),
                  })
                }
              }

              // Continue loop to get AI's response enriched by tool results
              continue
            }

            // Stream assistant message ONLY when there are no tool calls (final response)
            if (choice.message.content) {
              console.log('[AI Chat] Streaming final text content:', choice.message.content.substring(0, 100))
              const chunk = {
                type: 'text',
                text: choice.message.content,
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
              hasStreamedContent = true
            }

            // Check finish reason
            if (choice.finish_reason === 'stop') {
              console.log('[AI Chat] Conversation complete (stop)')
              break
            } else if (choice.finish_reason === 'length') {
              console.log('[AI Chat] Response truncated due to length')
              const warningChunk = {
                type: 'text',
                text: '\n\n[Response truncated due to length limit]',
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(warningChunk)}\n\n`))
              break
            } else if (choice.finish_reason === 'tool_calls') {
              console.log('[AI Chat] Finish reason is tool_calls, continuing loop')
              continue
            } else {
              console.log('[AI Chat] Unknown finish reason, breaking')
              break
            }
          } catch (iterationError) {
            console.error(`[AI Chat] Error in iteration ${iterations}:`, iterationError)
            
            // Stream error message to user
            const errorChunk = {
              type: 'text',
              text: `\n\n⚠️ An error occurred: ${iterationError instanceof Error ? iterationError.message : 'Unknown error'}`,
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
            break
          }
        }

        if (iterations >= maxIterations) {
          console.warn('[AI Chat] Max iterations reached')
          const warningChunk = {
            type: 'text',
            text: '\n\n[Maximum tool calling iterations reached]',
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(warningChunk)}\n\n`))
        }

        if (!hasStreamedContent) {
          console.warn('[AI Chat] No content was streamed')
          const fallbackChunk = {
            type: 'text',
            text: 'I apologize, but I encountered an issue processing your request. Please try again.',
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackChunk)}\n\n`))
        }

        console.log('[AI Chat] Streaming complete')
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        console.error('[AI Chat] Fatal streaming error:', error)
        
        // Try to send error message to client
        try {
          const errorChunk = {
            type: 'text',
            text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (e) {
          console.error('[AI Chat] Failed to send error to client:', e)
        }
        
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

async function handleGeminiChat(messages: Array<{ role: string; parts: Array<{ type: string; text: string }> }>) {
  if (!genAI) {
    throw new Error('Gemini not configured')
  }

  // Define tools for Gemini in Gemini's format
  const geminiTools = [
    {
      functionDeclarations: [
        {
          name: 'analyzeSatellite',
          description: 'Analyze satellite imagery to identify optimal afforestation sites using NDVI and NDMI indices.',
          parameters: {
            type: 'object',
            properties: {
              latitude: { type: 'number', description: 'Latitude of the center point' },
              longitude: { type: 'number', description: 'Longitude of the center point' },
              radiusKm: { type: 'number', description: 'Radius in kilometers to analyze' },
            },
            required: ['latitude', 'longitude'],
          },
        },
        {
          name: 'getWeather',
          description: 'Get current weather conditions and 5-day forecast for a location.',
          parameters: {
            type: 'object',
            properties: {
              latitude: { type: 'number', description: 'Latitude' },
              longitude: { type: 'number', description: 'Longitude' },
            },
            required: ['latitude', 'longitude'],
          },
        },
        {
          name: 'checkDeforestation',
          description: 'Check for recent deforestation alerts in an area.',
          parameters: {
            type: 'object',
            properties: {
              latitude: { type: 'number', description: 'Latitude' },
              longitude: { type: 'number', description: 'Longitude' },
              radiusKm: { type: 'number', description: 'Radius in kilometers' },
            },
            required: ['latitude', 'longitude'],
          },
        },
        {
          name: 'analyzeSoil',
          description: 'Analyze comprehensive soil profile using SoilGrids API. Returns texture, drainage, pH, nutrients, CEC, bulk density, water retention, fertility rating, and recommendations.',
          parameters: {
            type: 'object',
            properties: {
              latitude: { type: 'number', description: 'Latitude' },
              longitude: { type: 'number', description: 'Longitude' },
            },
            required: ['latitude', 'longitude'],
          },
        },
        {
          name: 'recommendSpecies',
          description: 'Get species recommendations based on climate and soil conditions.',
          parameters: {
            type: 'object',
            properties: {
              temperature: { type: 'number', description: 'Average temperature in Celsius' },
              humidity: { type: 'number', description: 'Average humidity percentage' },
              annualRainfall: { type: 'number', description: 'Estimated annual rainfall in mm' },
              soilPh: { type: 'number', description: 'Soil pH value' },
              soilNitrogen: { type: 'number', description: 'Soil nitrogen in mg/kg' },
              organicMatter: { type: 'number', description: 'Organic matter percentage' },
              suitabilityScore: { type: 'number', description: 'Site suitability score' },
            },
            required: ['temperature', 'humidity', 'annualRainfall', 'soilPh', 'soilNitrogen', 'organicMatter'],
          },
        },
        {
          name: 'predictImpact',
          description: 'Calculate predicted ecosystem impact of reforestation over time.',
          parameters: {
            type: 'object',
            properties: {
              areaHectares: { type: 'number', description: 'Area to be planted in hectares' },
              speciesList: { type: 'array', items: { type: 'string' }, description: 'List of species to be planted' },
              timelineYears: { type: 'number', description: 'Projection timeline in years' },
            },
            required: ['areaHectares', 'speciesList'],
          },
        },
        {
          name: 'getSpeciesDetails',
          description: 'Get detailed information about a specific tree species including stress tolerance, environmental effects, and optimal growing conditions.',
          parameters: {
            type: 'object',
            properties: {
              speciesName: { type: 'string', description: 'Common name or scientific name of the species' },
            },
            required: ['speciesName'],
          },
        },
        {
          name: 'getSpeciesByCondition',
          description: 'Get list of species that are well-suited for specific challenging conditions like drought, flooding, frost, urban pollution, or poor soil.',
          parameters: {
            type: 'object',
            properties: {
              condition: { 
                type: 'string', 
                description: 'The condition to filter by: drought, flood, frost, urban, or poor_soil' 
              },
            },
            required: ['condition'],
          },
        },
      ],
    },
  ]

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    tools: geminiTools,
  })

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: msg.parts.map(p => ({ text: p.text })),
  }))

  const lastMessage = messages[messages.length - 1]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const chat = model.startChat({ history })
        let chatHistory = [...history]
        let iterations = 0
        const maxIterations = 10
        let hasStreamedContent = false
        let currentUserMessage = lastMessage.parts.map(p => p.text).join('')

        console.log('[Gemini Chat] Starting with message:', currentUserMessage.substring(0, 100))

        while (iterations < maxIterations) {
          iterations++
          console.log(`[Gemini Chat] Iteration ${iterations}/${maxIterations}`)

          const result = await chat.sendMessage(currentUserMessage)
          const response = result.response
          
          // Check for function calls
          const functionCalls = response.functionCalls()
          
          if (functionCalls && functionCalls.length > 0) {
            console.log(`[Gemini Chat] Processing ${functionCalls.length} function calls`)
            
            const functionResponses = []
            
            for (const call of functionCalls) {
              const toolName = call.name
              const args = call.args as Record<string, unknown>

              console.log(`[Gemini Chat] Executing tool: ${toolName}`, args)

              // Stream tool invocation notification
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'tool-invocation',
                toolName,
                args,
              })}\n\n`))

              try {
                const toolResult = await executeTool(toolName, args)
                console.log(`[Gemini Chat] Tool ${toolName} succeeded`)

                // Stream tool result
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool-result',
                  toolName,
                  result: toolResult,
                })}\n\n`))

                functionResponses.push({
                  functionResponse: {
                    name: toolName,
                    response: toolResult,
                  },
                })
              } catch (toolError) {
                console.error(`[Gemini Chat] Tool error for ${toolName}:`, toolError)
                
                const errorResult = {
                  success: false,
                  error: toolError instanceof Error ? toolError.message : 'Unknown error',
                }

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool-result',
                  toolName,
                  result: errorResult,
                })}\n\n`))

                functionResponses.push({
                  functionResponse: {
                    name: toolName,
                    response: errorResult,
                  },
                })
              }
            }

            // Send function responses back to the model
            const functionResultMessage = await chat.sendMessage(functionResponses)
            const functionResultResponse = functionResultMessage.response
            
            // Check if there are more function calls
            const moreFunctionCalls = functionResultResponse.functionCalls()
            if (moreFunctionCalls && moreFunctionCalls.length > 0) {
              // Continue the loop with empty message to process more function calls
              currentUserMessage = ''
              continue
            }

            // Get the text response after function execution
            const text = functionResultResponse.text()
            if (text) {
              console.log('[Gemini Chat] Streaming text after function calls')
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`))
              hasStreamedContent = true
            }
            break
          } else {
            // No function calls, just stream the text
            const text = response.text()
            if (text) {
              console.log('[Gemini Chat] Streaming text response')
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`))
              hasStreamedContent = true
            }
            break
          }
        }

        if (!hasStreamedContent) {
          console.warn('[Gemini Chat] No content was streamed')
          const fallbackChunk = {
            type: 'text',
            text: 'I apologize, but I encountered an issue processing your request. Please try again.',
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackChunk)}\n\n`))
        }

        console.log('[Gemini Chat] Streaming complete')
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        console.error('Gemini chat error:', error)
        
        try {
          const errorChunk = {
            type: 'text',
            text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (e) {
          console.error('[Gemini Chat] Failed to send error to client:', e)
        }
        
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
