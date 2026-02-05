/**
 * Soil Service - SoilGrids API (ISRIC)
 * Comprehensive soil analysis using real SoilGrids data
 * API Documentation: https://rest.isric.org/soilgrids/v2.0/docs
 */

// Available soil properties from SoilGrids
export type SoilProperty = 
  | 'bdod'     // Bulk density (cg/cm³)
  | 'cec'      // Cation Exchange Capacity (mmol(c)/kg)
  | 'cfvo'     // Coarse fragments volumetric (cm³/dm³)
  | 'clay'     // Clay content (g/kg)
  | 'nitrogen' // Total nitrogen (cg/kg)
  | 'ocd'      // Organic carbon density (hg/m³)
  | 'ocs'      // Organic carbon stocks (t/ha)
  | 'phh2o'    // pH in H2O (pH*10)
  | 'sand'     // Sand content (g/kg)
  | 'silt'     // Silt content (g/kg)
  | 'soc'      // Soil organic carbon (dg/kg)
  | 'wv0010'   // Volumetric Water Content at 10kPa (0.1 v%/v%)
  | 'wv0033'   // Volumetric Water Content at 33kPa (0.1 v%/v%)
  | 'wv1500';  // Volumetric Water Content at 1500kPa (0.1 v%/v%)

// Available depth layers
export type SoilDepth = '0-5cm' | '5-15cm' | '15-30cm' | '30-60cm' | '60-100cm' | '100-200cm';

// Raw API response layer structure
interface SoilGridsLayer {
  name: string;
  unit_measure: {
    mapped_units: string;
    target_units: string;
    conversion_factor: number;
  };
  depths: Array<{
    label: string;
    range: { top_depth: number; bottom_depth: number; unit_depth: string };
    values: {
      mean: number;
      uncertainty?: number;
      Q0_05?: number;
      Q0_5?: number;
      Q0_95?: number;
    };
  }>;
}

// Parsed soil data for a single depth
export interface SoilLayerData {
  depth: string;
  clay: number;           // % (0-100)
  sand: number;           // % (0-100)
  silt: number;           // % (0-100)
  pH: number;             // pH units (0-14)
  nitrogen: number;       // g/kg
  organicCarbon: number;  // g/kg
  cec: number;            // cmol(c)/kg
  bulkDensity: number;    // g/cm³
  coarseFragments: number; // % volume
  waterRetention: {
    fieldCapacity: number;    // % (at 33kPa)
    wiltingPoint: number;     // % (at 1500kPa)
    availableWater: number;   // % difference
  };
}

// Full soil profile with multiple depths
export interface SoilProfile {
  location: { lat: number; lon: number };
  layers: SoilLayerData[];
  textureClass: string;
  drainageClass: string;
  fertilityRating: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
  summary: {
    avgPH: number;
    avgOrganicMatter: number;
    avgNitrogen: number;
    soilHealthScore: number;
    recommendations: string[];
  };
}

// Simple soil data interface for backward compatibility
export interface SoilData {
  clay: number;
  sand: number;
  silt: number;
  pH: number;
  nitrogen: number;
  organic_carbon: number;
  cec: number;
  bulk_density: number;
}

// Legacy interface for gis-tools compatibility
export interface LegacySoilData {
  ph: number;
  nitrogen: number;
  phosphorus: number;
  calcium?: number;
  potassium: number;
  organicMatter: number;
  texture: string;
  drainage: string;
}

const SOILGRIDS_BASE_URL = 'https://rest.isric.org/soilgrids/v2.0';

// Utility: round to 2 decimal places
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/**
 * Fetch comprehensive soil data from SoilGrids API
 */
export async function fetchSoilProfile(
  lat: number, 
  lon: number,
  depths: SoilDepth[] = ['0-5cm', '5-15cm', '15-30cm', '30-60cm']
): Promise<SoilProfile> {
  const properties: SoilProperty[] = [
    'clay', 'sand', 'silt', 'phh2o', 'nitrogen', 'soc', 
    'cec', 'bdod', 'cfvo', 'wv0033', 'wv1500'
  ];

  const url = new URL(`${SOILGRIDS_BASE_URL}/properties/query`);
  url.searchParams.set('lon', lon.toString());
  url.searchParams.set('lat', lat.toString());
  properties.forEach(p => url.searchParams.append('property', p));
  depths.forEach(d => url.searchParams.append('depth', d));
  url.searchParams.set('value', 'mean');

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SoilGrids API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.properties?.layers) {
      throw new Error('Invalid response structure from SoilGrids API');
    }

    const layers: SoilGridsLayer[] = data.properties.layers;
    const parsedLayers = parseSoilLayers(layers, depths);
    
    return buildSoilProfile(lat, lon, parsedLayers);
  } catch (error) {
    console.error('SoilGrids API error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to fetch soil data from SoilGrids');
  }
}

/**
 * Simple soil data fetch for backward compatibility
 */
export async function fetchSoilData(lat: number, lon: number): Promise<SoilData> {
  const properties: SoilProperty[] = ['clay', 'sand', 'silt', 'phh2o', 'nitrogen', 'soc', 'cec', 'bdod'];
  const depth: SoilDepth = '0-5cm';
  
  const url = `${SOILGRIDS_BASE_URL}/properties/query?lon=${lon}&lat=${lat}&property=${properties.join('&property=')}&depth=${depth}&value=mean`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      throw new Error(`SoilGrids API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.properties?.layers) {
      throw new Error('Invalid response from SoilGrids API');
    }

    const layers = data.properties.layers;
    const getValue = (propName: string): number => {
      const layer = layers.find((l: SoilGridsLayer) => l.name === propName);
      return layer?.depths?.[0]?.values?.mean ?? 0;
    };

    const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
    return {
      clay: round2(getValue('clay') / 10),          // g/kg to %
      sand: round2(getValue('sand') / 10),
      silt: round2(getValue('silt') / 10),
      pH: round2(getValue('phh2o') / 10),           // pH*10 to pH
      nitrogen: round2(getValue('nitrogen') / 100),  // cg/kg to g/kg
      organic_carbon: round2(getValue('soc') / 10),  // dg/kg to g/kg
      cec: round2(getValue('cec') / 10),            // mmol(c)/kg to cmol(c)/kg
      bulk_density: round2(getValue('bdod') / 100)   // cg/cm³ to g/cm³
    };
  } catch (error) {
    console.error('Soil data fetch error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch soil data');
  }
}

/**
 * Fetch soil data in legacy format for gis-tools compatibility
 */
export async function fetchLegacySoilData(lat: number, lon: number): Promise<LegacySoilData> {
  try {
    const profile = await fetchSoilProfile(lat, lon, ['0-5cm', '5-15cm']);
    const topLayer = profile.layers[0];
    
    return {
      ph: Math.round((topLayer.pH + Number.EPSILON) * 100) / 100,
      nitrogen: Math.round((topLayer.nitrogen * 100 + Number.EPSILON) * 100) / 100, // mg/kg
      phosphorus: Math.round((estimatePhosphorus(topLayer) + Number.EPSILON) * 100) / 100,
      calcium: Math.round((estimateCalcium(topLayer) + Number.EPSILON) * 100) / 100,
      potassium: Math.round((estimatePotassium(topLayer) + Number.EPSILON) * 100) / 100,
      organicMatter: Math.round((topLayer.organicCarbon * 1.724 + Number.EPSILON) * 100) / 100,
      texture: profile.textureClass,
      drainage: profile.drainageClass,
    };
  } catch (error) {
    console.error('Legacy soil data fetch error:', error);
    throw error;
  }
}

/**
 * Parse SoilGrids layers into structured data
 */
function parseSoilLayers(layers: SoilGridsLayer[], depths: SoilDepth[]): SoilLayerData[] {
  const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
  const getValueForDepth = (propName: string, depthLabel: string): number => {
    const layer = layers.find(l => l.name === propName);
    if (!layer) return 0;
    const depthData = layer.depths.find(d => d.label === depthLabel);
    return depthData?.values?.mean ?? 0;
  };

  return depths.map(depth => {
    const fieldCapacity = getValueForDepth('wv0033', depth) / 10; // 0.1 v%/v% to %
    const wiltingPoint = getValueForDepth('wv1500', depth) / 10;

    return {
      depth,
      clay: round2(getValueForDepth('clay', depth) / 10),
      sand: round2(getValueForDepth('sand', depth) / 10),
      silt: round2(getValueForDepth('silt', depth) / 10),
      pH: round2(getValueForDepth('phh2o', depth) / 10),
      nitrogen: round2(getValueForDepth('nitrogen', depth) / 100),
      organicCarbon: round2(getValueForDepth('soc', depth) / 10),
      cec: round2(getValueForDepth('cec', depth) / 10),
      bulkDensity: round2(getValueForDepth('bdod', depth) / 100),
      coarseFragments: round2(getValueForDepth('cfvo', depth) / 10),
      waterRetention: {
        fieldCapacity: round2(fieldCapacity),
        wiltingPoint: round2(wiltingPoint),
        availableWater: round2(Math.max(0, fieldCapacity - wiltingPoint)),
      },
    };
  });
}

/**
 * Build comprehensive soil profile from parsed layers
 */
function buildSoilProfile(lat: number, lon: number, layers: SoilLayerData[]): SoilProfile {
  const topLayer = layers[0];
  
  // Determine soil texture class using USDA soil texture triangle
  const textureClass = classifySoilTexture(topLayer.clay, topLayer.sand, topLayer.silt);
  
  // Determine drainage class based on texture and bulk density
  const drainageClass = classifyDrainage(topLayer);
  
  // Calculate fertility rating
  const fertilityRating = calculateFertilityRating(topLayer);
  
  // Calculate averages across all layers
  const avgPH = layers.reduce((sum, l) => sum + l.pH, 0) / layers.length;
  const avgOC = layers.reduce((sum, l) => sum + l.organicCarbon, 0) / layers.length;
  const avgN = layers.reduce((sum, l) => sum + l.nitrogen, 0) / layers.length;
  
  // Calculate soil health score (0-100)
  const soilHealthScore = calculateSoilHealthScore(topLayer, avgPH, avgOC);
  
  // Generate recommendations
  const recommendations = generateSoilRecommendations(topLayer, avgPH, fertilityRating, textureClass);
  const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

  return {
    location: { lat, lon },
    layers,
    textureClass,
    drainageClass,
    fertilityRating,
    summary: {
      avgPH: round2(avgPH),
      avgOrganicMatter: round2(avgOC * 1.724), // OC to OM
      avgNitrogen: round2(avgN),
      soilHealthScore: round2(soilHealthScore),
      recommendations,
    },
  };
}

/**
 * USDA Soil Texture Triangle Classification
 */
function classifySoilTexture(clay: number, sand: number, silt: number): string {
  // Normalize if needed
  const total = clay + sand + silt;
  if (total > 0 && Math.abs(total - 100) > 5) {
    clay = (clay / total) * 100;
    sand = (sand / total) * 100;
    silt = (silt / total) * 100;
  }

  if (clay >= 40) {
    if (silt >= 40) return 'Silty Clay';
    if (sand >= 45) return 'Sandy Clay';
    return 'Clay';
  }
  if (clay >= 27 && clay < 40) {
    if (sand >= 20 && sand < 45) return 'Clay Loam';
    if (silt >= 28 && sand < 20) return 'Silty Clay Loam';
    return 'Sandy Clay Loam';
  }
  if (clay >= 7 && clay < 27) {
    if (silt >= 28 && silt < 50 && sand < 52) return 'Loam';
    if (silt >= 50 && clay < 12) return 'Silt Loam';
    if (silt >= 50 && clay >= 12) return 'Silty Clay Loam';
    if (sand >= 43 && sand < 85 && silt < 28) return 'Sandy Loam';
    return 'Loam';
  }
  if (clay < 7) {
    if (silt >= 80) return 'Silt';
    if (sand >= 85) return 'Sand';
    if (sand >= 70) return 'Loamy Sand';
    return 'Silt Loam';
  }
  return 'Loam';
}

/**
 * Classify soil drainage based on texture and physical properties
 */
function classifyDrainage(layer: SoilLayerData): string {
  const { clay, sand, bulkDensity, waterRetention } = layer;
  
  // High sand = well drained
  if (sand > 70) return 'Excessively Drained';
  if (sand > 50 && clay < 20) return 'Well Drained';
  
  // High clay or bulk density = poor drainage
  if (clay > 40 || bulkDensity > 1.6) return 'Poorly Drained';
  if (clay > 30) return 'Somewhat Poorly Drained';
  
  // Check water retention
  if (waterRetention.fieldCapacity > 40) return 'Moderately Drained';
  if (waterRetention.availableWater < 10) return 'Well Drained';
  
  return 'Moderately Well Drained';
}

/**
 * Calculate fertility rating from soil properties
 */
function calculateFertilityRating(layer: SoilLayerData): 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High' {
  let score = 0;
  
  // CEC scoring (cmol/kg)
  if (layer.cec > 25) score += 3;
  else if (layer.cec > 15) score += 2;
  else if (layer.cec > 10) score += 1;
  
  // Organic carbon scoring (g/kg)
  if (layer.organicCarbon > 30) score += 3;
  else if (layer.organicCarbon > 15) score += 2;
  else if (layer.organicCarbon > 8) score += 1;
  
  // Nitrogen scoring (g/kg)
  if (layer.nitrogen > 2) score += 2;
  else if (layer.nitrogen > 1) score += 1;
  
  // pH scoring (optimal 6.0-7.5)
  if (layer.pH >= 6.0 && layer.pH <= 7.5) score += 2;
  else if (layer.pH >= 5.5 && layer.pH <= 8.0) score += 1;
  
  if (score >= 9) return 'Very High';
  if (score >= 7) return 'High';
  if (score >= 4) return 'Moderate';
  if (score >= 2) return 'Low';
  return 'Very Low';
}

/**
 * Calculate overall soil health score (0-100)
 */
function calculateSoilHealthScore(layer: SoilLayerData, avgPH: number, avgOC: number): number {
  let score = 0;
  
  // pH score (optimal 6.0-7.0) - max 25 points
  if (avgPH >= 6.0 && avgPH <= 7.0) score += 25;
  else if (avgPH >= 5.5 && avgPH <= 7.5) score += 20;
  else if (avgPH >= 5.0 && avgPH <= 8.0) score += 10;
  else score += 5;
  
  // Organic matter score - max 25 points
  const om = avgOC * 1.724;
  if (om > 5) score += 25;
  else if (om > 3) score += 20;
  else if (om > 2) score += 15;
  else if (om > 1) score += 10;
  else score += 5;
  
  // CEC score - max 20 points
  if (layer.cec > 20) score += 20;
  else if (layer.cec > 15) score += 15;
  else if (layer.cec > 10) score += 10;
  else score += 5;
  
  // Water retention - max 15 points
  if (layer.waterRetention.availableWater > 15) score += 15;
  else if (layer.waterRetention.availableWater > 10) score += 12;
  else if (layer.waterRetention.availableWater > 5) score += 8;
  else score += 4;
  
  // Bulk density (lower is better for roots) - max 15 points
  if (layer.bulkDensity < 1.2) score += 15;
  else if (layer.bulkDensity < 1.4) score += 12;
  else if (layer.bulkDensity < 1.6) score += 8;
  else score += 4;
  
  return Math.min(100, score);
}

// Ensure soil health score is reported to 2 decimal places where used
function calculateSoilHealthScoreRounded(layer: SoilLayerData, avgPH: number, avgOC: number): number {
  const raw = calculateSoilHealthScore(layer, avgPH, avgOC);
  return round2(raw);
}

/**
 * Generate actionable soil recommendations
 */
function generateSoilRecommendations(
  layer: SoilLayerData, 
  avgPH: number, 
  fertility: string,
  texture: string
): string[] {
  const recommendations: string[] = [];
  
  // pH recommendations
  if (avgPH < 5.5) {
    recommendations.push('Apply agricultural lime to raise pH - acidic conditions limit nutrient availability');
  } else if (avgPH < 6.0) {
    recommendations.push('Consider light lime application to optimize pH for most crops');
  } else if (avgPH > 8.0) {
    recommendations.push('Apply sulfur or acidifying fertilizers to lower pH - high alkalinity restricts micronutrients');
  } else if (avgPH > 7.5) {
    recommendations.push('Select species tolerant of alkaline conditions');
  }
  
  // Organic matter recommendations
  const om = layer.organicCarbon * 1.724;
  if (om < 2) {
    recommendations.push('Add organic matter through composting, mulching, or cover crops - critical for soil health');
  } else if (om < 3) {
    recommendations.push('Consider adding mulch or compost to boost organic matter levels');
  }
  
  // Nitrogen recommendations
  if (layer.nitrogen < 0.5) {
    recommendations.push('Nitrogen-fixing species (legumes) recommended to improve nitrogen availability');
  }
  
  // Texture-based recommendations
  if (texture.includes('Sand') || texture === 'Loamy Sand') {
    recommendations.push('Sandy soil - add organic matter to improve water retention and nutrient holding');
  } else if (texture.includes('Clay') && !texture.includes('Loam')) {
    recommendations.push('Heavy clay soil - add gypsum or organic matter to improve structure and drainage');
  }
  
  // Drainage recommendations
  if (layer.bulkDensity > 1.6) {
    recommendations.push('High soil compaction detected - consider deep tillage or cover crops with deep roots');
  }
  
  // CEC recommendations
  if (layer.cec < 10) {
    recommendations.push('Low nutrient retention capacity - use split fertilizer applications to reduce leaching');
  }
  
  // Fertility summary
  if (fertility === 'Very Low' || fertility === 'Low') {
    recommendations.push('Prioritize soil building with compost and green manures before intensive planting');
  } else if (fertility === 'Very High') {
    recommendations.push('Excellent soil fertility - ideal for establishing diverse species');
  }
  
  return recommendations.slice(0, 5); // Limit to 5 most important
}

/**
 * Estimate phosphorus from CEC and organic carbon (not directly available in SoilGrids)
 */
function estimatePhosphorus(layer: SoilLayerData): number {
  // Phosphorus correlates with organic matter and CEC
  const baseP = 15;
  const ocBonus = layer.organicCarbon * 0.8;
  const cecBonus = layer.cec * 0.3;
  const val = baseP + ocBonus + cecBonus;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Estimate potassium from CEC (not directly available in SoilGrids)
 */
function estimatePotassium(layer: SoilLayerData): number {
  // Potassium availability correlates with clay content and CEC
  const baseK = 100;
  const clayBonus = layer.clay * 2;
  const cecBonus = layer.cec * 4;
  const val = baseK + clayBonus + cecBonus;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Estimate calcium (Ca) from clay and CEC as a rough proxy
 */
function estimateCalcium(layer: SoilLayerData): number {
  const baseCa = 300; // baseline mg/kg proxy
  const clayBonus = layer.clay * 3;
  const cecBonus = layer.cec * 6;
  const val = baseCa + clayBonus + cecBonus;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Get suitability for specific tree species based on soil profile
 */
export function assessSpeciesSuitability(
  profile: SoilProfile,
  species: { 
    preferredPH?: { min: number; max: number };
    droughtTolerance?: 'low' | 'moderate' | 'high';
    nutrientRequirements?: 'low' | 'moderate' | 'high';
  }
): { score: number; notes: string[] } {
  const topLayer = profile.layers[0];
  let score = 50;
  const notes: string[] = [];
  
  // pH suitability
  if (species.preferredPH) {
    if (topLayer.pH >= species.preferredPH.min && topLayer.pH <= species.preferredPH.max) {
      score += 20;
      notes.push('pH is optimal for this species');
    } else if (Math.abs(topLayer.pH - (species.preferredPH.min + species.preferredPH.max) / 2) < 1) {
      score += 10;
      notes.push('pH is acceptable but not optimal');
    } else {
      score -= 15;
      notes.push('pH may require adjustment for this species');
    }
  }
  
  // Drainage suitability
  if (species.droughtTolerance === 'high' && profile.drainageClass.includes('Well')) {
    score += 15;
    notes.push('Drainage suits drought-tolerant species');
  } else if (species.droughtTolerance === 'low' && profile.drainageClass.includes('Poor')) {
    score += 10;
    notes.push('Moisture-retentive soil suits this species');
  }
  
  // Nutrient requirements
  if (species.nutrientRequirements === 'high' && 
      (profile.fertilityRating === 'High' || profile.fertilityRating === 'Very High')) {
    score += 15;
    notes.push('Soil fertility meets species requirements');
  } else if (species.nutrientRequirements === 'low') {
    score += 10;
    notes.push('Species can thrive in current soil conditions');
  }
  
  const bounded = Math.min(100, Math.max(0, score));
  return { score: round2(bounded), notes };
}
