/**
 * Soil API Route
 * GET /api/soil?lat=<lat>&lon=<lon>&profile=true (optional)
 * 
 * Uses SoilGrids API (ISRIC) for comprehensive soil data
 * - Basic mode: Returns clay, sand, silt, pH, nitrogen, organic_carbon, CEC, bulk_density
 * - Profile mode (?profile=true): Returns full depth profile with texture class, drainage, recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchSoilData, fetchSoilProfile } from '@/lib/services/soil';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const profileMode = searchParams.get('profile') === 'true';

    if (!latParam || !lonParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat and lon' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates. Lat must be -90 to 90, lon must be -180 to 180' },
        { status: 400 }
      );
    }

    // Use comprehensive profile if requested
    if (profileMode) {
      const profile = await fetchSoilProfile(lat, lon);
      return NextResponse.json(
        {
          success: true,
          source: 'SoilGrids (ISRIC)',
          data: profile
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800'
          }
        }
      );
    }

    // Basic mode
    const data = await fetchSoilData(lat, lon);

    return NextResponse.json(
      {
        success: true,
        source: 'SoilGrids (ISRIC)',
        data
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800'
        }
      }
    );
  } catch (error) {
    console.error('Soil API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch soil data'
      },
      { status: 500 }
    );
  }
}
