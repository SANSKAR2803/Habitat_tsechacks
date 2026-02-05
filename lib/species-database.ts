/**
 * Global Reforestation Species Database
 * Comprehensive species data with stress tolerance and environmental effects
 */

export interface SpeciesStressTolerance {
  drought: string
  flood: string
  frost: string
  high_aqi: string
  nutrient_depletion: string
}

export interface SpeciesEnvironmentalEffects {
  carbon_sequestration: string
  soil_profile: string
  water_cycle: string
  air_quality: string
  maturation_impact: string
}

export interface SpeciesData {
  id: number
  common_name: string
  scientific_name: string
  climatic_region: string
  stress_tolerance: SpeciesStressTolerance
  environmental_effects: SpeciesEnvironmentalEffects
}

// Comprehensive species database
export const SPECIES_DATABASE: SpeciesData[] = [
  {
    id: 1,
    common_name: "Neem",
    scientific_name: "Azadirachta indica",
    climatic_region: "Tropical and Subtropical (Arid to Semi-humid)",
    stress_tolerance: {
      drought: "High - Can survive in regions with rainfall as low as 400mm.",
      flood: "Low - Does not tolerate waterlogging well.",
      frost: "Low - Susceptible to freezing temperatures.",
      high_aqi: "High - Excellent at trapping dust and absorbing pollutants.",
      nutrient_depletion: "High - Thrives in rocky, shallow, and poor soils."
    },
    environmental_effects: {
      carbon_sequestration: "Moderate to High. Rapid biomass accumulation in early years.",
      soil_profile: "Improves soil fertility by reducing acidity and mining nutrients from deep soil layers. Leaves act as natural mulch.",
      water_cycle: "Deep taproot system helps stabilize the water table.",
      air_quality: "Releases high amounts of oxygen and acts as a natural air purifier against SO2 and NO2.",
      maturation_impact: "As a sapling, it acts as a soil binder. As a mature tree, it provides a dense canopy that significantly lowers ambient ground temperature and supports insect biodiversity."
    }
  },
  {
    id: 2,
    common_name: "Pedunculate Oak",
    scientific_name: "Quercus robur",
    climatic_region: "Temperate (Europe, parts of Asia)",
    stress_tolerance: {
      drought: "Moderate - Deep rooting allows survival in dry spells once established.",
      flood: "Moderate - Can tolerate intermittent flooding.",
      frost: "High - Very hardy against cold winters.",
      high_aqi: "Moderate - Can tolerate urban environments but sensitive to acute smog.",
      nutrient_depletion: "Moderate - Prefers deep, fertile soil but adapts to heavy clay."
    },
    environmental_effects: {
      carbon_sequestration: "Very High. Long-lived species that stores carbon for centuries.",
      soil_profile: "Leaf litter creates rich humus, significantly improving topsoil quality over decades.",
      water_cycle: "High transpiration rates contribute to cloud formation; roots prevent erosion.",
      air_quality: "Filters particulate matter efficiently due to large leaf surface area.",
      maturation_impact: "Saplings require protection from herbivores. Mature trees become 'keystone species,' supporting more wildlife (birds, insects, fungi) than almost any other tree type."
    }
  },
  {
    id: 3,
    common_name: "Red Mangrove",
    scientific_name: "Rhizophora mangle",
    climatic_region: "Tropical and Subtropical Coasts/Estuaries",
    stress_tolerance: {
      drought: "N/A - Adapted to saline water, but sensitive to hypersalinity if freshwater flow stops.",
      flood: "Extreme - Lives permanently in waterlogged, tidal zones.",
      frost: "Low - Cannot survive freezing temperatures.",
      high_aqi: "Moderate.",
      nutrient_depletion: "High - Adapted to anaerobic, nutrient-poor coastal soils."
    },
    environmental_effects: {
      carbon_sequestration: "Extreme (Blue Carbon). Sequesters carbon in sediment 10x faster than terrestrial forests.",
      soil_profile: "Builds land by trapping sediment in prop roots; prevents coastal erosion.",
      water_cycle: "Filters runoff water, removing nitrates and phosphates before they reach the ocean.",
      air_quality: "Local cooling effect on coastal zones.",
      maturation_impact: "Saplings stabilize immediate mudflats. Mature forests act as critical barriers against storm surges and tsunamis, protecting inland areas."
    }
  },
  {
    id: 4,
    common_name: "Baobab",
    scientific_name: "Adansonia digitata",
    climatic_region: "Hot, Arid Savannas (Africa, Australia)",
    stress_tolerance: {
      drought: "Extreme - Stores thousands of liters of water in its trunk.",
      flood: "Low - Susceptible to root rot.",
      frost: "Low.",
      high_aqi: "Low to Moderate.",
      nutrient_depletion: "High - Thrives in poor, rocky soils."
    },
    environmental_effects: {
      carbon_sequestration: "Moderate per tree, but critical in sparse landscapes.",
      soil_profile: "Prevents desertification; fallen leaves enrich poor savanna soils.",
      water_cycle: "Acts as a living reservoir, maintaining local humidity.",
      air_quality: "Minor direct filtration, but stabilizes dust.",
      maturation_impact: "Saplings are slow-growing. Mature trees create distinct micro-ecosystems, providing shade and shelter for hundreds of species in harsh heat."
    }
  },
  {
    id: 5,
    common_name: "Giant Bamboo",
    scientific_name: "Dendrocalamus asper",
    climatic_region: "Tropical and Subtropical (High humidity)",
    stress_tolerance: {
      drought: "Moderate - Rhizomes can survive dry spells, though growth slows.",
      flood: "Moderate - Can tolerate short-term waterlogging.",
      frost: "Low to Moderate (depending on species).",
      high_aqi: "High - Very efficient photosynthesis.",
      nutrient_depletion: "High - Can reclaim degraded land rapidly."
    },
    environmental_effects: {
      carbon_sequestration: "Extreme (Short-term). Absorbs carbon 4x faster than many hardwood trees.",
      soil_profile: "Extensive root mat prevents landslides and severe erosion.",
      water_cycle: "Raises water table by reducing runoff speed.",
      air_quality: "Releases 35% more oxygen than equivalent stands of trees.",
      maturation_impact: "Reaches full height in months/years rather than decades. Rapidly creates canopy cover, protecting soil from UV radiation and heavy rain impact."
    }
  },
  {
    id: 6,
    common_name: "London Plane",
    scientific_name: "Platanus × acerifolia",
    climatic_region: "Temperate Urban Zones",
    stress_tolerance: {
      drought: "High - Highly adaptable root system.",
      flood: "Moderate.",
      frost: "High.",
      high_aqi: "Extreme - Specifically adapted to shed bark, removing absorbed pollutants.",
      nutrient_depletion: "High - Tolerates compacted, poor urban soils."
    },
    environmental_effects: {
      carbon_sequestration: "Moderate.",
      soil_profile: "Can break up compacted soil over time.",
      water_cycle: "Manages storm water runoff in paved areas.",
      air_quality: "Exceptional at trapping particulate matter (PM2.5/PM10) on hairy leaves and bark.",
      maturation_impact: "Saplings are robust. Mature trees provide massive shade canopies (reducing urban heat island effect) and are resilient to physical damage."
    }
  },
  {
    id: 7,
    common_name: "Bald Cypress",
    scientific_name: "Taxodium distichum",
    climatic_region: "Wetlands / Riparian Zones (North America)",
    stress_tolerance: {
      drought: "Moderate - Surprisingly drought tolerant once established.",
      flood: "Extreme - Can live permanently in standing water.",
      frost: "Moderate.",
      high_aqi: "Moderate.",
      nutrient_depletion: "Moderate."
    },
    environmental_effects: {
      carbon_sequestration: "High - Long lifespan leads to significant biomass storage.",
      soil_profile: "Knees (pneumatophores) trap sediment and stabilize river banks.",
      water_cycle: "Filters pollutants from river water; slows floodwaters.",
      air_quality: "General air purification.",
      maturation_impact: "As it matures, it develops a buttressed base that acts as a physical barrier against water flow erosion, critical for maintaining wetland integrity."
    }
  },
  {
    id: 8,
    common_name: "Scots Pine",
    scientific_name: "Pinus sylvestris",
    climatic_region: "Boreal and Temperate (Cold climates)",
    stress_tolerance: {
      drought: "High - Adapted to sandy, well-drained soils.",
      flood: "Low.",
      frost: "Extreme - Survives sub-arctic winters.",
      high_aqi: "Moderate - Can suffer in high sulfur dioxide areas.",
      nutrient_depletion: "High - Needs very little nitrogen to thrive."
    },
    environmental_effects: {
      carbon_sequestration: "High - Dense wood stores significant carbon in cold climates.",
      soil_profile: "Needle drop acidifies soil (can be negative for some flora, good for fungi).",
      water_cycle: "Canopy intercepts heavy snowfall, regulating meltwater release.",
      air_quality: "Produces terpenes which interact with atmospheric chemistry; filters dust year-round.",
      maturation_impact: "Saplings are pioneer species in open ground. Mature stands create a unique microclimate that shelters understory species from wind and extreme cold."
    }
  },
  {
    id: 9,
    common_name: "Vetiver Grass",
    scientific_name: "Chrysopogon zizanioides",
    climatic_region: "Tropical/Subtropical (Global adaptation)",
    stress_tolerance: {
      drought: "High - Roots penetrate up to 3-4 meters.",
      flood: "High - Can survive complete submergence for weeks.",
      frost: "Low to Moderate.",
      high_aqi: "High.",
      nutrient_depletion: "Extreme - Grows in toxic, saline, or metal-heavy soils."
    },
    environmental_effects: {
      carbon_sequestration: "Moderate (Soil Carbon). Sequesters carbon deep in the soil profile via roots.",
      soil_profile: "The gold standard for erosion control; anchors soil on steep slopes.",
      water_cycle: "Increases groundwater recharge by 20-30% by slowing runoff.",
      air_quality: "N/A.",
      maturation_impact: "Non-invasive (sterile seeds). Forms a dense hedge that physically blocks sediment runoff and treats wastewater by absorbing nitrates and phosphates."
    }
  },
  {
    id: 10,
    common_name: "Eastern Cottonwood",
    scientific_name: "Populus deltoides",
    climatic_region: "Temperate Riparian",
    stress_tolerance: {
      drought: "Low - Requires access to water table.",
      flood: "High - Adapted to floodplains.",
      frost: "High.",
      high_aqi: "Moderate.",
      nutrient_depletion: "Moderate."
    },
    environmental_effects: {
      carbon_sequestration: "High rate (fast growth), but shorter lifespan than oaks.",
      soil_profile: "Rapid leaf turnover builds topsoil quickly.",
      water_cycle: "High water uptake can help drain swampy areas.",
      air_quality: "Good filtration, though produces pollen (allergen).",
      maturation_impact: "Acts as a 'nurse tree' providing quick shade that allows slower-growing, long-term species (like hardwoods) to establish underneath."
    }
  },
  // Additional species for Indian subcontinent and global coverage
  {
    id: 11,
    common_name: "Teak",
    scientific_name: "Tectona grandis",
    climatic_region: "Tropical (South/Southeast Asia)",
    stress_tolerance: {
      drought: "Moderate - Deciduous, drops leaves in dry season.",
      flood: "Low - Does not tolerate waterlogging.",
      frost: "Low - Tropical species.",
      high_aqi: "Moderate.",
      nutrient_depletion: "Moderate - Prefers deep, well-drained fertile soils."
    },
    environmental_effects: {
      carbon_sequestration: "High - Dense valuable timber stores carbon long-term.",
      soil_profile: "Large leaves provide excellent mulch; improves soil structure.",
      water_cycle: "Deep roots access groundwater; deciduous nature reduces water loss in dry season.",
      air_quality: "Good canopy for dust settling.",
      maturation_impact: "Saplings grow quickly in good conditions. Mature trees are highly valuable for timber, creating economic incentive for forest conservation."
    }
  },
  {
    id: 12,
    common_name: "Banyan",
    scientific_name: "Ficus benghalensis",
    climatic_region: "Tropical and Subtropical (Indian subcontinent)",
    stress_tolerance: {
      drought: "Moderate - Extensive root system helps survival.",
      flood: "Moderate - Aerial roots can adapt.",
      frost: "Low - Cannot tolerate freezing.",
      high_aqi: "High - Excellent air purifier.",
      nutrient_depletion: "High - Can grow on poor soils, even rocks."
    },
    environmental_effects: {
      carbon_sequestration: "Very High - Massive canopy and trunk store enormous carbon.",
      soil_profile: "Aerial roots stabilize soil; leaf litter enriches soil.",
      water_cycle: "Huge transpiration capacity; supports local rainfall patterns.",
      air_quality: "One of the best oxygen producers; absorbs CO2 effectively.",
      maturation_impact: "Grows into a forest-like structure. Single mature tree can cover acres, supporting thousands of species including birds, insects, and epiphytes."
    }
  },
  {
    id: 13,
    common_name: "Indian Rosewood",
    scientific_name: "Dalbergia sissoo",
    climatic_region: "Subtropical (Indian subcontinent)",
    stress_tolerance: {
      drought: "High - Deep taproot accesses groundwater.",
      flood: "Moderate - Can tolerate seasonal flooding.",
      frost: "Moderate - Some cold tolerance.",
      high_aqi: "High.",
      nutrient_depletion: "High - Nitrogen-fixing legume; improves soil."
    },
    environmental_effects: {
      carbon_sequestration: "High - Fast-growing hardwood.",
      soil_profile: "Fixes atmospheric nitrogen; significantly improves soil fertility.",
      water_cycle: "Deep roots prevent erosion along riverbanks.",
      air_quality: "Good canopy coverage for particle settling.",
      maturation_impact: "Excellent pioneer species for degraded lands. Mature trees provide valuable timber while having restored soil health for other species."
    }
  },
  {
    id: 14,
    common_name: "Sal",
    scientific_name: "Shorea robusta",
    climatic_region: "Tropical (Indian subcontinent)",
    stress_tolerance: {
      drought: "Moderate - Deciduous in dry areas.",
      flood: "Low - Prefers well-drained soil.",
      frost: "Low.",
      high_aqi: "Moderate.",
      nutrient_depletion: "Moderate - Prefers loamy soils."
    },
    environmental_effects: {
      carbon_sequestration: "Very High - Slow-growing but very long-lived.",
      soil_profile: "Leaf litter creates characteristic humus; supports unique understory.",
      water_cycle: "Dense canopy regulates local humidity.",
      air_quality: "Resin produces aromatic compounds beneficial for air.",
      maturation_impact: "Forms the dominant canopy of Sal forests - one of India's most important forest types, supporting unique biodiversity including elephants and tigers."
    }
  },
  {
    id: 15,
    common_name: "Eucalyptus",
    scientific_name: "Eucalyptus globulus",
    climatic_region: "Mediterranean to Subtropical",
    stress_tolerance: {
      drought: "High - Adapted to Australian dry conditions.",
      flood: "Low - Does not tolerate waterlogging.",
      frost: "Moderate - Some species frost tolerant.",
      high_aqi: "Moderate.",
      nutrient_depletion: "High - Can grow on very poor soils."
    },
    environmental_effects: {
      carbon_sequestration: "High - Very fast growth rate.",
      soil_profile: "Can deplete soil moisture; allelopathic effects on some plants.",
      water_cycle: "High water consumption - can lower water tables.",
      air_quality: "Releases eucalyptol - aromatic and mildly antibacterial.",
      maturation_impact: "Fast cover but controversial for biodiversity. Best used in degraded areas needing rapid stabilization, not as monocultures in natural forests."
    }
  },
  {
    id: 16,
    common_name: "Mango",
    scientific_name: "Mangifera indica",
    climatic_region: "Tropical",
    stress_tolerance: {
      drought: "Moderate - Deep roots help survival.",
      flood: "Low - Susceptible to root rot.",
      frost: "Low.",
      high_aqi: "Moderate to High.",
      nutrient_depletion: "Moderate."
    },
    environmental_effects: {
      carbon_sequestration: "High - Long-lived fruit tree.",
      soil_profile: "Leaf fall enriches soil; dense canopy protects soil.",
      water_cycle: "Moderate water needs; good shade reduces evaporation.",
      air_quality: "Dense foliage filters dust effectively.",
      maturation_impact: "Provides food security alongside environmental benefits. Mature orchards are important habitats for birds and pollinators, combining conservation with livelihoods."
    }
  }
]

/**
 * Parse stress tolerance level from text description
 */
export function parseToleranceLevel(description: string): number {
  const lowerDesc = description.toLowerCase()
  if (lowerDesc.includes('extreme')) return 95
  if (lowerDesc.includes('very high')) return 85
  if (lowerDesc.includes('high')) return 75
  if (lowerDesc.includes('moderate to high')) return 65
  if (lowerDesc.includes('moderate')) return 50
  if (lowerDesc.includes('low to moderate')) return 35
  if (lowerDesc.includes('low')) return 25
  if (lowerDesc.includes('n/a')) return 0
  return 50
}

/**
 * Parse carbon sequestration level
 */
export function parseCarbonLevel(description: string): number {
  const lowerDesc = description.toLowerCase()
  if (lowerDesc.includes('extreme')) return 60
  if (lowerDesc.includes('very high')) return 50
  if (lowerDesc.includes('high')) return 40
  if (lowerDesc.includes('moderate to high')) return 35
  if (lowerDesc.includes('moderate')) return 25
  return 20
}

/**
 * Match species to climate conditions
 */
export function matchClimateRegion(
  speciesRegion: string,
  temperature: number,
  humidity: number,
  rainfall: number
): number {
  const region = speciesRegion.toLowerCase()
  let score = 0

  // Temperature-based matching
  if (region.includes('tropical')) {
    if (temperature >= 20 && temperature <= 35) score += 30
    else if (temperature >= 15 && temperature <= 40) score += 15
  }
  if (region.includes('subtropical')) {
    if (temperature >= 15 && temperature <= 30) score += 30
    else if (temperature >= 10 && temperature <= 35) score += 15
  }
  if (region.includes('temperate')) {
    if (temperature >= 5 && temperature <= 25) score += 30
    else if (temperature >= 0 && temperature <= 30) score += 15
  }
  if (region.includes('arid') || region.includes('semi-arid')) {
    if (humidity < 50 && rainfall < 500) score += 20
  }
  if (region.includes('boreal') || region.includes('cold')) {
    if (temperature < 15) score += 25
  }
  if (region.includes('wetland') || region.includes('riparian')) {
    if (humidity > 60 && rainfall > 1000) score += 25
  }
  if (region.includes('coastal')) {
    score += 10 // Neutral bonus for coastal
  }
  if (region.includes('urban')) {
    score += 15 // Urban-adapted species get bonus
  }

  return Math.min(40, score)
}

/**
 * Get species recommendations based on environmental conditions
 */
export function getRecommendedSpecies(
  climate: { temperature: number; humidity: number; rainfall: number },
  soil: { ph: number; nitrogen: number; organicMatter: number },
  suitabilityScore: number,
  conditions?: {
    isCoastal?: boolean
    isUrban?: boolean
    hasFloodRisk?: boolean
    hasDroughtRisk?: boolean
    isHighAltitude?: boolean
  }
): Array<{
  name: string
  scientificName: string
  suitability: number
  climaticRegion: string
  waterRequirement: string
  carbonCapture: number
  growthRate: string
  droughtTolerance: number
  floodTolerance: number
  aqiTolerance: number
  notes: string
  stressTolerance: SpeciesStressTolerance
  environmentalEffects: SpeciesEnvironmentalEffects
}> {
  const annualRainfall = climate.rainfall * 365

  return SPECIES_DATABASE
    .map((species) => {
      let score = 30

      // Climate region matching
      score += matchClimateRegion(species.climatic_region, climate.temperature, climate.humidity, annualRainfall)

      // Stress tolerance scoring
      const droughtTolerance = parseToleranceLevel(species.stress_tolerance.drought)
      const floodTolerance = parseToleranceLevel(species.stress_tolerance.flood)
      const frostTolerance = parseToleranceLevel(species.stress_tolerance.frost)
      const aqiTolerance = parseToleranceLevel(species.stress_tolerance.high_aqi)
      const nutrientTolerance = parseToleranceLevel(species.stress_tolerance.nutrient_depletion)

      // Adjust for conditions
      if (conditions?.hasDroughtRisk && droughtTolerance >= 70) score += 15
      if (conditions?.hasFloodRisk && floodTolerance >= 70) score += 15
      if (conditions?.isUrban && aqiTolerance >= 70) score += 15
      if (conditions?.isCoastal && species.climatic_region.toLowerCase().includes('coast')) score += 15

      // Soil matching
      if (nutrientTolerance >= 70 && soil.organicMatter < 2) score += 10
      if (nutrientTolerance >= 70 && soil.nitrogen < 50) score += 10

      // Low humidity/rainfall adjustments
      if (climate.humidity < 40 && droughtTolerance >= 70) score += 15
      if (annualRainfall < 600 && droughtTolerance >= 70) score += 15

      // High humidity/rainfall adjustments
      if (climate.humidity > 70 && floodTolerance >= 50) score += 10
      if (annualRainfall > 1500 && floodTolerance >= 50) score += 10

      // Temperature matching
      if (climate.temperature < 10 && frostTolerance >= 70) score += 15
      if (climate.temperature > 30 && droughtTolerance >= 50) score += 10

      // Apply overall suitability modifier
      score = Math.round(score * (suitabilityScore / 60))
      score = Math.min(95, Math.max(15, score))

      // Determine water requirement
      const waterReq = droughtTolerance >= 75 ? 'Low' : droughtTolerance >= 50 ? 'Medium' : 'High'

      // Determine growth rate from maturation impact
      const maturationText = species.environmental_effects.maturation_impact.toLowerCase()
      let growthRate = 'Medium'
      if (maturationText.includes('fast') || maturationText.includes('rapid') || maturationText.includes('quickly')) {
        growthRate = 'Fast'
      } else if (maturationText.includes('slow')) {
        growthRate = 'Slow'
      }

      // Generate notes
      let notes = ''
      if (score >= 80) notes = 'Excellent match for local conditions. ' + species.environmental_effects.carbon_sequestration
      else if (score >= 65) notes = 'Good choice with minor adaptations needed. ' + species.stress_tolerance.drought.split(' - ')[0]
      else if (score >= 50) notes = 'Viable option - ' + species.environmental_effects.maturation_impact.split('.')[0]
      else notes = 'Consider for specific use cases. ' + species.climatic_region

      return {
        name: species.common_name,
        scientificName: species.scientific_name,
        suitability: score,
        climaticRegion: species.climatic_region,
        waterRequirement: waterReq,
        carbonCapture: parseCarbonLevel(species.environmental_effects.carbon_sequestration),
        growthRate,
        droughtTolerance,
        floodTolerance,
        aqiTolerance,
        notes,
        stressTolerance: species.stress_tolerance,
        environmentalEffects: species.environmental_effects,
      }
    })
    .sort((a, b) => b.suitability - a.suitability)
}

/**
 * Get detailed species info by name
 */
export function getSpeciesDetails(name: string): SpeciesData | undefined {
  return SPECIES_DATABASE.find(
    s => s.common_name.toLowerCase() === name.toLowerCase() ||
         s.scientific_name.toLowerCase() === name.toLowerCase()
  )
}

/**
 * Get all species for a specific condition
 */
export function getSpeciesForCondition(condition: 'drought' | 'flood' | 'frost' | 'urban' | 'poor_soil'): SpeciesData[] {
  return SPECIES_DATABASE.filter(species => {
    switch (condition) {
      case 'drought':
        return parseToleranceLevel(species.stress_tolerance.drought) >= 70
      case 'flood':
        return parseToleranceLevel(species.stress_tolerance.flood) >= 70
      case 'frost':
        return parseToleranceLevel(species.stress_tolerance.frost) >= 70
      case 'urban':
        return parseToleranceLevel(species.stress_tolerance.high_aqi) >= 70
      case 'poor_soil':
        return parseToleranceLevel(species.stress_tolerance.nutrient_depletion) >= 70
      default:
        return false
    }
  })
}

/**
 * Calculate ecosystem impact using species-specific data
 */
export function calculateSpeciesImpact(
  areaHectares: number,
  speciesNames: string[],
  timelineYears: number
): {
  carbonSequestration: number
  waterRetention: number
  biodiversityScore: number
  temperatureReduction: number
  aqiImprovement: number
  soilImprovement: string
  speciesBreakdown: Array<{
    name: string
    carbonContribution: number
    specialBenefits: string[]
  }>
} {
  const matchedSpecies = speciesNames
    .map(name => getSpeciesDetails(name))
    .filter((s): s is SpeciesData => s !== undefined)

  if (matchedSpecies.length === 0) {
    matchedSpecies.push(...SPECIES_DATABASE.slice(0, 3))
  }

  const maturityFactor = Math.min(1, timelineYears / 20)
  
  // Calculate average carbon capture
  const avgCarbon = matchedSpecies.reduce((sum, s) => 
    sum + parseCarbonLevel(s.environmental_effects.carbon_sequestration), 0
  ) / matchedSpecies.length

  // Calculate water retention based on species capabilities
  const waterSpecies = matchedSpecies.filter(s => 
    s.environmental_effects.water_cycle.toLowerCase().includes('water table') ||
    s.environmental_effects.water_cycle.toLowerCase().includes('groundwater') ||
    s.environmental_effects.water_cycle.toLowerCase().includes('runoff')
  )
  const waterBonus = waterSpecies.length * 5

  // Calculate AQI improvement
  const aqiSpecies = matchedSpecies.filter(s =>
    parseToleranceLevel(s.stress_tolerance.high_aqi) >= 70 ||
    s.environmental_effects.air_quality.toLowerCase().includes('exceptional') ||
    s.environmental_effects.air_quality.toLowerCase().includes('excellent')
  )
  const aqiBonus = aqiSpecies.length * 8

  // Biodiversity based on maturation impact
  const biodiversitySpecies = matchedSpecies.filter(s =>
    s.environmental_effects.maturation_impact.toLowerCase().includes('biodiversity') ||
    s.environmental_effects.maturation_impact.toLowerCase().includes('wildlife') ||
    s.environmental_effects.maturation_impact.toLowerCase().includes('species')
  )

  // Collect soil improvement notes
  const soilNotes = matchedSpecies
    .map(s => s.environmental_effects.soil_profile)
    .filter(note => note.length < 100)
    .slice(0, 3)
    .join(' ')

  // Species breakdown
  const speciesBreakdown = matchedSpecies.map(s => ({
    name: s.common_name,
    carbonContribution: Math.round(parseCarbonLevel(s.environmental_effects.carbon_sequestration) * areaHectares * maturityFactor / matchedSpecies.length),
    specialBenefits: [
      s.environmental_effects.carbon_sequestration.split('.')[0],
      s.environmental_effects.maturation_impact.split('.')[0]
    ]
  }))

  return {
    carbonSequestration: Math.round(areaHectares * avgCarbon * timelineYears * maturityFactor),
    waterRetention: Math.round(15 + maturityFactor * 35 + waterBonus),
    biodiversityScore: Math.round(20 + maturityFactor * 60 + biodiversitySpecies.length * 10),
    temperatureReduction: parseFloat((0.5 + maturityFactor * 2.5).toFixed(1)),
    aqiImprovement: Math.round(10 + maturityFactor * 25 + aqiBonus),
    soilImprovement: soilNotes || 'General soil health improvement expected from leaf litter and root systems.',
    speciesBreakdown
  }
}
