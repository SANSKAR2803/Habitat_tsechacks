'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Download,
  Layers,
  Map,
  Trees,
  Mountain,
  Grid3X3,
  Target,
  MapPin,
  Scan,
  Leaf,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import html2canvas from 'html2canvas'

interface MapCanvasProps {
  lat: number
  lng: number
  radius: number
  onLocationClick: (lat: number, lng: number) => void
  isAnalyzing?: boolean
  showSuitabilityOverlay?: boolean
  onAfforestationSitesDetected?: (sites: AfforestationSite[]) => void
}

export interface AfforestationSite {
  id: string
  bounds: L.LatLngBounds
  suitabilityScore: number // Composite: considers NDVI (barren potential) + NDMI (moisture)
  ndvi: number
  ndmi: number
  area: number // hectares
  category: 'high' | 'medium' | 'low'
}

// Helper: Calculate BBox from center and radius
function calculateBBox(
  lat: number,
  lng: number,
  radiusMeters: number
): [number, number, number, number] {
  const earthRadius = 6371000 // meters
  const latDelta = (radiusMeters / earthRadius) * (180 / Math.PI)
  const lngDelta =
    (radiusMeters / (earthRadius * Math.cos((lat * Math.PI) / 180))) *
    (180 / Math.PI)

  return [
    lng - lngDelta, // minX (west)
    lat - latDelta, // minY (south)
    lng + lngDelta, // maxX (east)
    lat + latDelta, // maxY (north)
  ]
}

// Updated Evalscript for Composite Suitability Index (Afforestation Site Detection)
// Uses B04 (Red), B08 (NIR), B11 (SWIR) from Sentinel-2
const SUITABILITY_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: ["B04", "B08", "B11"],
    output: { bands: 4 }
  };
}

function evaluatePixel(sample) {
  // Calculate NDVI (Vegetation Index)
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  
  // Calculate NDMI (Moisture Index)
  let ndmi = (sample.B08 - sample.B11) / (sample.B08 + sample.B11);
  
  // AFFORESTATION SITE SELECTION LOGIC:
  
  // Rule 1: Exclude existing dense vegetation (NDVI > 0.4 = already forest)
  if (ndvi > 0.4) {
    return [0, 0, 0, 0]; // Transparent - already forested
  }
  
  // Rule 2: Exclude water/urban areas (NDVI < 0)
  if (ndvi < 0) {
    return [0, 0, 0, 0]; // Transparent - water or urban
  }
  
  // Rule 3: Target barren/sparse vegetation land (NDVI 0.1 - 0.35)
  if (ndvi >= 0.1 && ndvi <= 0.35) {
    // Suitability based on moisture (higher NDMI = better)
    // NDMI ranges from -1 to 1, normalize to 0-1 for opacity
    let moistureScore = (ndmi + 1) / 2;
    let opacity = Math.max(0.2, Math.min(1.0, moistureScore));
    
    // Color: Blue-Green gradient based on moisture
    // Wet land (high NDMI): Bright blue-green
    // Dry land (low NDMI): Faint or nearly invisible
    if (ndmi > 0.3) {
      // High moisture - excellent site
      return [0.2, 0.8, 0.6, opacity]; // Bright teal
    } else if (ndmi > 0.1) {
      // Medium moisture - good site
      return [0.3, 0.7, 0.8, opacity * 0.8]; // Blue-green
    } else if (ndmi > -0.1) {
      // Low moisture - marginal site
      return [0.5, 0.6, 0.9, opacity * 0.5]; // Light blue
    } else {
      // Very dry - poor site (faint)
      return [0.6, 0.6, 0.7, opacity * 0.2]; // Very faint
    }
  }
  
  // Rule 4: Marginal areas (NDVI 0.35 - 0.4) - potential with clearing
  if (ndvi > 0.35 && ndvi <= 0.4) {
    let moistureScore = (ndmi + 1) / 2;
    return [0.4, 0.5, 0.3, moistureScore * 0.3]; // Faint yellow-green
  }
  
  // Everything else: transparent
  return [0, 0, 0, 0];
}
`

// Mock function to fetch Sentinel data and generate Suitability overlay
async function fetchAfforestationSuitability(
  bbox: [number, number, number, number]
): Promise<{ imageUrl: string; sites: AfforestationSite[] }> {
  // Real API call would look like this:
  /*
  const response = await fetch('https://services.sentinel-hub.com/api/v1/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SENTINEL_HUB_TOKEN}`
    },
    body: JSON.stringify({
      input: {
        bounds: {
          bbox: bbox,
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' }
        },
        data: [{
          type: 'sentinel-2-l2a',
          dataFilter: { 
            timeRange: { 
              from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months ago
              to: new Date().toISOString().split('T')[0] 
            } 
          }
        }]
      },
      output: { width: 512, height: 512, responses: [{ format: { type: 'image/png' } }] },
      evalscript: SUITABILITY_EVALSCRIPT
    })
  });
  const blob = await response.blob();
  return URL.createObjectURL(blob);
  */

  await new Promise((resolve) => setTimeout(resolve, 1200))

  const canvas = document.createElement('canvas')
  const gridSize = 512
  canvas.width = gridSize
  canvas.height = gridSize
  const ctx = canvas.getContext('2d')

  const [minX, minY, maxX, maxY] = bbox
  const sites: AfforestationSite[] = []
  const cellSize = 32 // Each cell represents a potential site
  const numCells = gridSize / cellSize

  if (ctx) {
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, gridSize, gridSize)

    for (let row = 0; row < numCells; row++) {
      for (let col = 0; col < numCells; col++) {
        const x = col * cellSize
        const y = row * cellSize

        // Simulate NDVI values (sparse vegetation / barren land detection)
        // Create realistic patterns: some areas forested, some barren, some water
        const basePattern =
          Math.sin((col / numCells) * Math.PI * 2 + 1) *
          Math.cos((row / numCells) * Math.PI * 1.5)
        const noise = (Math.random() - 0.5) * 0.3
        const ndvi = 0.25 + basePattern * 0.2 + noise

        // Simulate NDMI values (moisture index)
        const moisturePattern =
          Math.sin((col / numCells) * Math.PI + 0.5) *
          Math.cos((row / numCells) * Math.PI * 2)
        const moistureNoise = (Math.random() - 0.5) * 0.2
        const ndmi = moisturePattern * 0.5 + moistureNoise

        // Apply site selection logic (matching evalscript)

        // Skip if already forested (NDVI > 0.4)
        if (ndvi > 0.4) continue

        // Skip if water/urban (NDVI < 0)
        if (ndvi < 0) continue

        // Check if barren/sparse vegetation (NDVI 0.1 - 0.35)
        if (ndvi >= 0.1 && ndvi <= 0.35) {
          const moistureScore = (ndmi + 1) / 2
          const opacity = Math.max(0.2, Math.min(0.9, moistureScore))

          // Color based on moisture
          let r: number, g: number, b: number
          let category: 'high' | 'medium' | 'low'

          if (ndmi > 0.3) {
            // High moisture - excellent site (bright teal)
            r = 51
            g = 204
            b = 153
            category = 'high'
          } else if (ndmi > 0.1) {
            // Medium moisture - good site (blue-green)
            r = 77
            g = 179
            b = 204
            category = 'medium'
          } else if (ndmi > -0.1) {
            // Low moisture - marginal site (light blue)
            r = 128
            g = 153
            b = 230
            category = 'low'
          } else {
            // Very dry - poor site (very faint, skip from sites array)
            continue
          }

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
          ctx.fillRect(x, y, cellSize, cellSize)

          // Add border for high-quality sites
          if (category === 'high') {
            ctx.strokeStyle = `rgba(16, 185, 129, 0.9)`
            ctx.lineWidth = 2
            ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
          }

          // Calculate suitability score (0-100)
          // Based on: optimal NDVI range (0.15-0.3) + high NDMI
          const ndviScore = 1 - Math.abs(ndvi - 0.225) / 0.225 // Peak at 0.225
          const ndmiScore = (ndmi + 1) / 2
          const suitabilityScore = (ndviScore * 0.4 + ndmiScore * 0.6) * 100

          // Calculate geographic bounds for this cell
          const cellLatHeight = (maxY - minY) / numCells
          const cellLngWidth = (maxX - minX) / numCells
          const south = maxY - (row + 1) * cellLatHeight
          const north = maxY - row * cellLatHeight
          const west = minX + col * cellLngWidth
          const east = minX + (col + 1) * cellLngWidth

          // Only add significant sites
          if (suitabilityScore > 40) {
            sites.push({
              id: `site-${row}-${col}`,
              bounds: L.latLngBounds([south, west], [north, east]),
              suitabilityScore,
              ndvi,
              ndmi,
              area:
                Math.round(cellLatHeight * cellLngWidth * 111 * 111 * 100) /
                100,
              category,
            })
          }
        }
      }
    }
  }

  return {
    imageUrl: canvas.toDataURL('image/png'),
    sites: sites.sort((a, b) => b.suitabilityScore - a.suitabilityScore),
  }
}

export function MapCanvas({
  lat,
  lng,
  radius,
  onLocationClick,
  isAnalyzing,
  showSuitabilityOverlay,
  onAfforestationSitesDetected,
}: MapCanvasProps) {
  const [exportStep, setExportStep] = useState<string | null>(null)
  const [activeLayer, setActiveLayer] = useState<
    'osm' | 'satellite' | 'terrain'
  >('satellite')
  const [showForestCover, setShowForestCover] = useState(true) // Keep general forest ON
  const [showStateBoundaries, setShowStateBoundaries] = useState(false) // Default OFF
  const [showProtectedAreas, setShowProtectedAreas] = useState(false) // Default OFF
  const [showForestZones, setShowForestZones] = useState(false) // Default OFF
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [detectedSites, setDetectedSites] = useState<AfforestationSite[]>([])
  const [selectedSite, setSelectedSite] = useState<AfforestationSite | null>(
    null
  )
  const [isClient, setIsClient] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const overlayLayerRef = useRef<L.ImageOverlay | null>(null)
  const siteLayersRef = useRef<L.Rectangle[]>([])
  const groupLayerRef = useRef<L.Rectangle | null>(null)
  const forestZonesLayerRef = useRef<L.GeoJSON | null>(null) // Reference for forest zones layer
  const labelsLayerRef = useRef<L.TileLayer | null>(null) // Reference for labels overlay
  const forestCoverLayerRef = useRef<L.TileLayer | null>(null) // Reference for forest cover overlay
  const boundariesLayerRef = useRef<L.TileLayer | null>(null) // Reference for boundaries overlay
  const protectedAreasLayerRef = useRef<L.LayerGroup | null>(null) // Reference for protected areas markers

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load Indian Forest Zones
  useEffect(() => {
    if (!mapRef.current || !isClient) return

    const loadForestZones = async () => {
      try {
        const response = await fetch('/data/india-forest-zones.json')
        const geojsonData = await response.json()

        // Remove existing forest zones layer
        if (forestZonesLayerRef.current) {
          mapRef.current?.removeLayer(forestZonesLayerRef.current)
        }

        if (showForestZones) {
          // Color mapping based on health status
          const getColor = (health: string) => {
            switch (health) {
              case 'healthy':
                return '#10b981' // Green
              case 'moderate':
                return '#f59e0b' // Yellow/Amber
              case 'poor':
                return '#f97316' // Orange
              case 'critical':
                return '#ef4444' // Red
              default:
                return '#6b7280' // Gray
            }
          }

          // Create GeoJSON layer
          const forestLayer = L.geoJSON(geojsonData, {
            style: (feature: GeoJSON.Feature | undefined) => {
              const health = feature?.properties?.health || 'moderate'
              return {
                fillColor: getColor(health),
                weight: 2,
                opacity: 0.9,
                color: getColor(health),
                fillOpacity: 0.25, // Increased from 0.15 for better visibility
              }
            },
            onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer) => {
              const props = feature.properties
              if (props) {
                // Create popup content
                const popupContent = `
                  <div class="forest-zone-popup">
                    <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #f8fafc;">
                      ${props.name}
                    </h3>
                    <div style="font-size: 12px; line-height: 1.6; color: #cbd5e1;">
                      <p style="margin: 4px 0;"><strong>States:</strong> ${props.state}</p>
                      <p style="margin: 4px 0;"><strong>Forest Cover:</strong> ${props.forestCover}%</p>
                      <p style="margin: 4px 0;"><strong>NDVI:</strong> ${props.ndvi}</p>
                      <p style="margin: 4px 0;"><strong>Risk Level:</strong> 
                        <span style="color: ${getColor(props.health)}; font-weight: 600;">
                          ${props.riskLevel.toUpperCase()}
                        </span>
                      </p>
                      <p style="margin: 8px 0 0 0; font-style: italic; color: #94a3b8;">
                        ${props.description}
                      </p>
                    </div>
                  </div>
                `
                layer.bindPopup(popupContent, {
                  maxWidth: 300,
                  className: 'forest-zone-popup-container',
                })

                // Hover effects
                layer.on('mouseover', function (this: L.Path) {
                  this.setStyle({
                    fillOpacity: 0.45, // Increased from 0.35
                    weight: 3,
                  })
                })
                layer.on('mouseout', function (this: L.Path) {
                  this.setStyle({
                    fillOpacity: 0.25, // Increased from 0.15
                    weight: 2,
                  })
                })
              }
            },
          })

          forestLayer.addTo(mapRef.current!)
          forestZonesLayerRef.current = forestLayer
        }
      } catch (error) {
        console.error('Failed to load forest zones:', error)
      }
    }

    loadForestZones()
  }, [isClient, showForestZones])

  // Forest Cover Overlay (General forest density visualization)
  useEffect(() => {
    if (!mapRef.current || !isClient) return

    // Remove existing forest cover layer
    if (forestCoverLayerRef.current) {
      mapRef.current.removeLayer(forestCoverLayerRef.current)
      forestCoverLayerRef.current = null
    }

    if (showForestCover) {
      // Add a semi-transparent green overlay to show general forest areas
      // Using OpenStreetMap's natural=wood layer visualization
      const forestCoverLayer = L.tileLayer(
        'https://tiles.wmflabs.org/osm-no-labels/{z}/{x}/{y}.png',
        {
          attribution: '',
          opacity: 0.3,
          maxZoom: 18,
        }
      )
      forestCoverLayer.addTo(mapRef.current)
      forestCoverLayerRef.current = forestCoverLayer
    }
  }, [isClient, showForestCover])

  // State Boundaries Overlay
  useEffect(() => {
    if (!mapRef.current || !isClient) return

    // Remove existing boundaries layer
    if (boundariesLayerRef.current) {
      mapRef.current.removeLayer(boundariesLayerRef.current)
      boundariesLayerRef.current = null
    }

    if (showStateBoundaries) {
      // Add state boundary lines using CartoDB boundaries overlay
      const boundariesLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        {
          attribution: '',
          opacity: 0.5,
          maxZoom: 20,
        }
      )
      boundariesLayer.addTo(mapRef.current)
      boundariesLayerRef.current = boundariesLayer
    }
  }, [isClient, showStateBoundaries])

  // Protected Areas (Major National Parks and Wildlife Sanctuaries)
  useEffect(() => {
    if (!mapRef.current || !isClient) return

    // Remove existing protected areas
    if (protectedAreasLayerRef.current) {
      mapRef.current.removeLayer(protectedAreasLayerRef.current)
      protectedAreasLayerRef.current = null
    }

    if (showProtectedAreas) {
      // Major protected areas in India
      const protectedAreas = [
        { name: 'Jim Corbett National Park', lat: 29.5317, lng: 78.7750, state: 'Uttarakhand' },
        { name: 'Kaziranga National Park', lat: 26.5775, lng: 93.1711, state: 'Assam' },
        { name: 'Ranthambore National Park', lat: 26.0173, lng: 76.5026, state: 'Rajasthan' },
        { name: 'Sundarbans National Park', lat: 21.9497, lng: 88.9997, state: 'West Bengal' },
        { name: 'Bandipur National Park', lat: 11.6667, lng: 76.5833, state: 'Karnataka' },
        { name: 'Periyar National Park', lat: 9.4647, lng: 77.2350, state: 'Kerala' },
        { name: 'Gir National Park', lat: 21.1333, lng: 70.8000, state: 'Gujarat' },
        { name: 'Kanha National Park', lat: 22.3333, lng: 80.6167, state: 'Madhya Pradesh' },
        { name: 'Bandhavgarh National Park', lat: 23.7000, lng: 81.0333, state: 'Madhya Pradesh' },
        { name: 'Nagarhole National Park', lat: 12.0000, lng: 76.1000, state: 'Karnataka' },
      ]

      const layerGroup = L.layerGroup()

      protectedAreas.forEach((area) => {
        // Create custom icon for protected areas
        const protectedIcon = L.divIcon({
          className: 'protected-area-marker',
          html: `
            <div style="
              background: rgba(34, 197, 94, 0.9);
              border: 2px solid #fff;
              border-radius: 50%;
              width: 16px;
              height: 16px;
              box-shadow: 0 2px 8px rgba(34, 197, 94, 0.5);
            "></div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })

        const marker = L.marker([area.lat, area.lng], { icon: protectedIcon })
        
        marker.bindPopup(`
          <div style="font-family: system-ui; padding: 4px;">
            <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #22c55e;">
              🌳 ${area.name}
            </h4>
            <p style="margin: 0; font-size: 11px; color: #64748b;">
              ${area.state}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8;">
              Protected Wildlife Area
            </p>
          </div>
        `, {
          maxWidth: 200,
          className: 'protected-area-popup',
        })

        marker.addTo(layerGroup)
      })

      layerGroup.addTo(mapRef.current)
      protectedAreasLayerRef.current = layerGroup
    }
  }, [isClient, showProtectedAreas])

  // Initialize map
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return

    if (mapRef.current) {
      mapRef.current.remove()
    }

    // Center on India by default (20.5937°N, 78.9629°E)
    // Zoom level 5 shows entire India, zoom 13 for detailed view
    const initialZoom = lat === 20.5937 && lng === 78.9629 ? 5 : 13
    
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: initialZoom,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Base layer - Start with satellite for better vegetation visibility
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      }
    )
    satelliteLayer.addTo(map)

    // Custom marker icon
    const markerIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-pin">
          <div class="marker-inner"></div>
          <div class="marker-pulse"></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })

    // Add marker
    const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map)
    markerRef.current = marker

    // Add analysis circle
    const radiusMeters = radius * 1000
    const circle = L.circle([lat, lng], {
      radius: radiusMeters,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.05,
      weight: 2,
      dashArray: '8, 8',
    }).addTo(map)
    circleRef.current = circle

    // Click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng
      onLocationClick(
        Math.round(clickLat * 1000000) / 1000000,
        Math.round(clickLng * 1000000) / 1000000
      )
    })

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [isClient])

  // Update base layer
  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current

    // Remove existing base layers
    map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.TileLayer) {
        const attr = (layer as L.TileLayer).options.attribution || ''
        if (
          attr.includes('OpenStreetMap') ||
          attr.includes('Esri') ||
          attr.includes('OpenTopoMap') ||
          attr.includes('CartoDB')
        ) {
          // Check if it's a base layer (not an overlay)
          const tileLayer = layer as L.TileLayer
          if (tileLayer.getTileUrl) {
            try {
              const url = tileLayer.getTileUrl(L.point(0, 0) as any)
              if (url && !url.includes('labels') && !url.includes('boundaries')) {
                map.removeLayer(layer)
              }
            } catch (e) {
              // Ignore getTileUrl errors
            }
          }
        }
      }
    })

    // Add new base layer with best quality tiles for India
    let newLayer: L.TileLayer
    if (activeLayer === 'osm') {
      // Using CartoDB Voyager - cleaner, better for India, works great with Leaflet
      newLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        }
      )
    } else if (activeLayer === 'satellite') {
      // Esri World Imagery - best free satellite tiles
      newLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 19,
        }
      )
    } else {
      // OpenTopoMap - excellent terrain visualization
      newLayer = L.tileLayer(
        'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        {
          attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
          maxZoom: 17,
        }
      )
    }
    newLayer.addTo(map)
    newLayer.bringToBack()

    // Remove existing labels layer
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current)
      labelsLayerRef.current = null
    }

    // Add labels overlay for all base layers (especially important for satellite view)
    // Using CartoDB labels which show cities, states, and boundaries
    const labelsLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      {
        attribution: '',
        subdomains: 'abcd',
        maxZoom: 20,
        pane: 'overlayPane', // Ensure labels are on top
      }
    )
    labelsLayer.addTo(map)
    labelsLayerRef.current = labelsLayer
  }, [activeLayer])

  // Update marker and circle position
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) return

    const radiusMeters = radius * 1000
    markerRef.current.setLatLng([lat, lng])
    circleRef.current.setLatLng([lat, lng])
    circleRef.current.setRadius(radiusMeters)
    mapRef.current.setView([lat, lng], mapRef.current.getZoom())
  }, [lat, lng, radius])

  // Search for location
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || !mapRef.current) return

    setIsSearching(true)
    try {
      // Use Nominatim (OpenStreetMap) geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const { lat: searchLat, lon: searchLon } = data[0]
        const newLat = parseFloat(searchLat)
        const newLng = parseFloat(searchLon)
        
        // Update map view and trigger location click
        mapRef.current.setView([newLat, newLng], 13)
        onLocationClick(newLat, newLng)
        setSearchQuery('') // Clear search
      } else {
        alert('Location not found. Try a different search term.')
      }
    } catch (error) {
      console.error('Search failed:', error)
      alert('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, onLocationClick])

  // Load suitability overlay and detect sites
  const loadSuitabilityOverlay = useCallback(async () => {
    if (!mapRef.current) return

    const bbox = calculateBBox(lat, lng, radius * 1000)

    // Fetch suitability data (NDVI + NDMI composite)
    const { imageUrl, sites } = await fetchAfforestationSuitability(bbox)
    setOverlayUrl(imageUrl)
    setDetectedSites(sites)
    onAfforestationSitesDetected?.(sites)

    // Remove existing overlay
    if (overlayLayerRef.current) {
      mapRef.current.removeLayer(overlayLayerRef.current)
    }

    // Remove existing site layers
    siteLayersRef.current.forEach((layer) => {
      mapRef.current?.removeLayer(layer)
    })
    siteLayersRef.current = []

    if (groupLayerRef.current) {
      mapRef.current.removeLayer(groupLayerRef.current)
      groupLayerRef.current = null
    }

    // Add new overlay
    const bounds = L.latLngBounds(
      [bbox[1], bbox[0]], // SW
      [bbox[3], bbox[2]] // NE
    )

    const overlay = L.imageOverlay(imageUrl, bounds, {
      opacity: 0.85,
      interactive: false,
    }).addTo(mapRef.current)
    overlayLayerRef.current = overlay

    // Draw borders around high-suitability sites (green zones)
    const highQualitySites = sites.filter((s) => s.category === 'high')

    // Draw individual site boundaries
    highQualitySites.forEach((site) => {
      if (!mapRef.current) return

      const rect = L.rectangle(site.bounds, {
        color: '#10b981',
        weight: 2,
        fillColor: '#10b981',
        fillOpacity: 0.15,
        className: 'afforestation-site',
      })

      rect.on('click', () => setSelectedSite(site))
      rect.on('mouseover', () => {
        rect.setStyle({ fillOpacity: 0.35, weight: 3 })
      })
      rect.on('mouseout', () => {
        rect.setStyle({ fillOpacity: 0.15, weight: 2 })
      })

      rect.bindTooltip(
        `<div class="site-tooltip">
          <strong>Afforestation Site</strong><br/>
          Suitability: ${site.suitabilityScore.toFixed(0)}%<br/>
          NDVI: ${site.ndvi.toFixed(2)} | NDMI: ${site.ndmi.toFixed(2)}<br/>
          Area: ${site.area.toFixed(2)} ha
        </div>`,
        { permanent: false, direction: 'top' }
      )

      rect.addTo(mapRef.current)
      siteLayersRef.current.push(rect)
    })

    // Group adjacent high-quality sites with a unified border
    if (highQualitySites.length > 0) {
      let unionBounds = highQualitySites[0].bounds
      highQualitySites.forEach((site) => {
        unionBounds = unionBounds.extend(site.bounds)
      })

      const groupRect = L.rectangle(unionBounds, {
        color: '#10b981',
        weight: 3,
        fill: false,
        dashArray: undefined,
        className: 'site-group-border',
      }).addTo(mapRef.current)
      groupLayerRef.current = groupRect
    }
  }, [lat, lng, radius, onAfforestationSitesDetected])

  // Trigger overlay loading
  useEffect(() => {
    if (showSuitabilityOverlay && !isAnalyzing) {
      loadSuitabilityOverlay()
    } else if (!showSuitabilityOverlay && mapRef.current) {
      // Clear overlay and sites
      if (overlayLayerRef.current) {
        mapRef.current.removeLayer(overlayLayerRef.current)
        overlayLayerRef.current = null
      }
      siteLayersRef.current.forEach((layer) => {
        mapRef.current?.removeLayer(layer)
      })
      siteLayersRef.current = []
      if (groupLayerRef.current) {
        mapRef.current.removeLayer(groupLayerRef.current)
        groupLayerRef.current = null
      }
      setDetectedSites([])
      setOverlayUrl(null)
      setSelectedSite(null)
    }
  }, [showSuitabilityOverlay, isAnalyzing, loadSuitabilityOverlay])

  const handleExport = async () => {
    if (!mapRef.current || !mapContainerRef.current) return

    try {
      setExportStep('Capturing map...')
      
      // Capture map screenshot with better error handling
      try {
        const canvas = await html2canvas(mapContainerRef.current, {
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#1a1a1a',
          logging: false,
          ignoreElements: (element) => {
            // Ignore elements that might cause issues
            return element.classList?.contains('leaflet-control') || false
          },
        })
        
        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `map-screenshot-${lat.toFixed(4)}-${lng.toFixed(4)}-${Date.now()}.png`
            link.click()
            URL.revokeObjectURL(url)
          }
        })
      } catch (screenshotError) {
        console.warn('Screenshot capture failed, continuing with data export:', screenshotError)
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
      setExportStep('Preparing data...')

      // Prepare analysis data
      const analysisData = {
        location: {
          latitude: lat,
          longitude: lng,
          radius_km: radius,
        },
        timestamp: new Date().toISOString(),
        detected_sites: detectedSites.map(site => ({
          id: site.id,
          category: site.category,
          suitability_score: site.suitabilityScore,
          ndvi: site.ndvi,
          ndmi: site.ndmi,
          area_hectares: site.area,
          bounds: {
            south: site.bounds.getSouth(),
            west: site.bounds.getWest(),
            north: site.bounds.getNorth(),
            east: site.bounds.getEast(),
          }
        })),
        summary: {
          total_sites: detectedSites.length,
          high_suitability_sites: highSites.length,
          medium_suitability_sites: mediumSites.length,
          total_area_hectares: totalArea,
        }
      }

      setExportStep('Generating files...')
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Export as JSON
      const jsonBlob = new Blob([JSON.stringify(analysisData, null, 2)], {
        type: 'application/json'
      })
      const jsonUrl = URL.createObjectURL(jsonBlob)
      const jsonLink = document.createElement('a')
      jsonLink.href = jsonUrl
      jsonLink.download = `afforestation-analysis-${lat.toFixed(4)}-${lng.toFixed(4)}-${Date.now()}.json`
      jsonLink.click()
      URL.revokeObjectURL(jsonUrl)

      // Export as CSV
      const csvHeader = 'Site ID,Category,Suitability Score,NDVI,NDMI,Area (ha),South,West,North,East\n'
      const csvRows = detectedSites.map(site => 
        `${site.id},${site.category},${site.suitabilityScore.toFixed(2)},${site.ndvi.toFixed(3)},${site.ndmi.toFixed(3)},${site.area.toFixed(2)},${site.bounds.getSouth().toFixed(6)},${site.bounds.getWest().toFixed(6)},${site.bounds.getNorth().toFixed(6)},${site.bounds.getEast().toFixed(6)}`
      ).join('\n')
      const csvContent = csvHeader + csvRows

      const csvBlob = new Blob([csvContent], { type: 'text/csv' })
      const csvUrl = URL.createObjectURL(csvBlob)
      const csvLink = document.createElement('a')
      csvLink.href = csvUrl
      csvLink.download = `afforestation-sites-${lat.toFixed(4)}-${lng.toFixed(4)}-${Date.now()}.csv`
      csvLink.click()
      URL.revokeObjectURL(csvUrl)

      setExportStep('Complete!')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setExportStep(null)
    } catch (error) {
      console.error('Export failed:', error)
      setExportStep('Failed')
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setExportStep(null)
    }
  }

  // Calculate stats
  const highSites = detectedSites.filter((s) => s.category === 'high')
  const mediumSites = detectedSites.filter((s) => s.category === 'medium')
  const totalArea = detectedSites.reduce((sum, s) => sum + s.area, 0)

  return (
    <div className="relative h-full w-full overflow-hidden isolate">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="h-full w-full"
        style={{ minHeight: '100%' }}
      />

      {/* Search Bar - Top Center */}
      <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-card/90 backdrop-blur-sm border-border/50 pr-10"
              disabled={isSearching}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isSearching || !searchQuery.trim()}
            className="bg-primary/90 backdrop-blur-sm"
          >
            {isSearching ? 'Searching...' : 'Go'}
          </Button>
        </form>
      </div>

      {/* Map Controls - Top Right */}
      <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
        {/* Base Layer Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-card/90 backdrop-blur-sm border border-border/50"
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">
                {activeLayer === 'osm'
                  ? 'Street'
                  : activeLayer === 'satellite'
                    ? 'Satellite'
                    : 'Terrain'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[1001]">
            <DropdownMenuLabel>Base Layer</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setActiveLayer('osm')}>
              <Map className="mr-2 h-4 w-4" />
              OpenStreetMap
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveLayer('satellite')}>
              <Layers className="mr-2 h-4 w-4" />
              Satellite
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveLayer('terrain')}>
              <Mountain className="mr-2 h-4 w-4" />
              Terrain
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Overlay Layers */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-card/90 backdrop-blur-sm border border-border/50"
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overlays</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[1001] w-48">
            <DropdownMenuLabel>Map Overlays</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowForestZones(!showForestZones)}
            >
              <Trees className="mr-2 h-4 w-4" />
              Indian Forest Zones
              {showForestZones && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  On
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowForestCover(!showForestCover)}
            >
              <Leaf className="mr-2 h-4 w-4" />
              General Forest Cover
              {showForestCover && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  On
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowStateBoundaries(!showStateBoundaries)}
            >
              <Layers className="mr-2 h-4 w-4" />
              State Boundaries
              {showStateBoundaries && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  On
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowProtectedAreas(!showProtectedAreas)}
            >
              <Target className="mr-2 h-4 w-4" />
              National Parks
              {showProtectedAreas && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  On
                </Badge>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {showSuitabilityOverlay && detectedSites.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={exportStep !== null}
            className="gap-2 bg-card/90 backdrop-blur-sm border border-border/50"
          >
            <Download className="h-4 w-4" />
            {exportStep || 'Export'}
          </Button>
        )}
      </div>

      {/* Coordinates Display - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-card/90 px-3 py-2 font-mono text-xs text-muted-foreground backdrop-blur-sm border border-border/50">
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          {lat.toFixed(6)}°N, {lng.toFixed(6)}°E
        </div>
        <div className="mt-1 text-muted-foreground/70">
          Radius: {radius}km | Area: {(Math.PI * radius * radius).toFixed(1)}km²
        </div>
      </div>

      {/* Suitability Legend - Bottom Right */}
      {showSuitabilityOverlay && overlayUrl && (
        <div className="absolute bottom-4 right-4 z-[1000] rounded-lg bg-card/90 px-4 py-3 backdrop-blur-sm border border-border/50 max-w-[220px]">
          <div className="flex items-center gap-2 mb-3">
            <Scan className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">
              Suitability Index
            </p>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-[#33cc99]" />
                <span className="text-muted-foreground">High Moisture</span>
              </div>
              <span className="text-foreground font-medium">Excellent</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-[#4db3cc]" />
                <span className="text-muted-foreground">Med Moisture</span>
              </div>
              <span className="text-foreground font-medium">Good</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-[#8099e6] opacity-60" />
                <span className="text-muted-foreground">Low Moisture</span>
              </div>
              <span className="text-muted-foreground">Marginal</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">
              Filtering: NDVI 0.1-0.35 (barren land)
            </p>
            <p className="text-xs text-muted-foreground">
              Opacity = NDMI (moisture)
            </p>
          </div>
        </div>
      )}

      {/* Detected Sites Summary - Top Left */}
      {showSuitabilityOverlay && detectedSites.length > 0 && (
        <div className="absolute left-4 top-4 z-[1000] rounded-lg bg-card/90 p-4 backdrop-blur-sm border border-border/50 max-w-[240px]">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Afforestation Sites
          </h4>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">High Priority</span>
                <span className="font-mono text-primary">
                  {highSites.length} sites
                </span>
              </div>
              <Progress
                value={(highSites.length / Math.max(detectedSites.length, 1)) * 100}
                className="h-1.5"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Medium Priority</span>
                <span className="font-mono text-foreground">
                  {mediumSites.length} sites
                </span>
              </div>
              <Progress
                value={(mediumSites.length / Math.max(detectedSites.length, 1)) * 100}
                className="h-1.5"
              />
            </div>

            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total Area</span>
                <span className="font-mono text-foreground">
                  {totalArea.toFixed(1)} ha
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">Avg Score</span>
                <span className="font-mono text-primary">
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
            </div>
          </div>

          {selectedSite && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs font-medium text-foreground mb-2">
                Selected Site
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Score</span>
                  <p className="font-mono text-primary">
                    {selectedSite.suitabilityScore.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Area</span>
                  <p className="font-mono">{selectedSite.area.toFixed(2)} ha</p>
                </div>
                <div>
                  <span className="text-muted-foreground">NDVI</span>
                  <p className="font-mono">{selectedSite.ndvi.toFixed(3)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">NDMI</span>
                  <p className="font-mono">{selectedSite.ndmi.toFixed(3)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Forest Zones Legend - Top Left (when no sites detected) */}
      {showForestZones && !showSuitabilityOverlay && (
        <div className="absolute left-4 top-4 z-[1000] rounded-lg bg-card/90 p-4 backdrop-blur-sm border border-border/50 max-w-[240px]">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trees className="h-4 w-4 text-primary" />
            Indian Forest Zones
          </h4>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-sm bg-[#10b981]" />
              <span className="text-muted-foreground">Healthy (70%+ cover)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-sm bg-[#f59e0b]" />
              <span className="text-muted-foreground">Moderate (50-70%)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-sm bg-[#f97316]" />
              <span className="text-muted-foreground">Poor (30-50%)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-sm bg-[#ef4444]" />
              <span className="text-muted-foreground">Critical (&lt;30%)</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 mt-3">
            <p className="text-xs text-muted-foreground">
              Click on any zone for detailed information
            </p>
          </div>
        </div>
      )}

      {/* Inject custom styles */}
      <style jsx global>{`
        .marker-pin {
          position: relative;
          width: 24px;
          height: 24px;
        }
        .marker-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 12px;
          height: 12px;
          margin: -6px 0 0 -6px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.5);
        }
        .marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 24px;
          height: 24px;
          margin: -12px 0 0 -12px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.3);
          animation: marker-pulse 2s ease-out infinite;
        }
        @keyframes marker-pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .leaflet-container {
          background: #0f172a;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.95);
          color: #f8fafc;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.95);
        }
        .site-tooltip {
          font-size: 12px;
          line-height: 1.5;
        }
        .afforestation-site {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .site-group-border {
          animation: group-pulse 2s ease-in-out infinite;
        }
        @keyframes group-pulse {
          0%,
          100% {
            stroke-opacity: 1;
          }
          50% {
            stroke-opacity: 0.4;
          }
        }
      `}</style>
    </div>
  )
}

export default MapCanvas
