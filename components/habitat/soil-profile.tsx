'use client'

import { Beaker, FlaskConical, Layers, TestTube } from 'lucide-react'
import type { SoilProfile as SoilProfileType } from '@/lib/types'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface SoilProfileProps {
  data: SoilProfileType
  isLoading?: boolean
}

export function SoilProfile({ data, isLoading }: SoilProfileProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const phStatus =
    data.ph >= 6 && data.ph <= 7.5
      ? 'optimal'
      : data.ph < 5.5 || data.ph > 8
        ? 'critical'
        : 'warning'

  const getPhColor = () => {
    if (phStatus === 'optimal') return 'text-emerald-500'
    if (phStatus === 'warning') return 'text-amber-500'
    return 'text-rose-500'
  }

  const nutrients = [
    {
      name: 'Nitrogen (N)',
      value: data.nitrogen,
      max: 500,
      unit: 'kg/ha',
      icon: FlaskConical,
      color: 'bg-blue-500',
    },
    {
      name: 'Phosphorus (P)',
      value: data.phosphorus,
      max: 100,
      unit: 'kg/ha',
      icon: TestTube,
      color: 'bg-amber-500',
    },
    {
      name: 'Potassium (K)',
      value: data.potassium,
      max: 300,
      unit: 'kg/ha',
      icon: Beaker,
      color: 'bg-emerald-500',
    },
    {
      name: 'Organic Matter',
      value: data.organicMatter,
      max: 10,
      unit: '%',
      icon: Layers,
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="space-y-4">
      {/* pH Section */}
      <div className="rounded-xl border border-border/50 bg-card/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Soil pH Level</p>
            <div className="flex items-baseline gap-2">
              <span className={cn('font-mono text-3xl font-bold', getPhColor())}>
                {Number(data.ph).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">
                {phStatus === 'optimal'
                  ? 'Optimal'
                  : phStatus === 'warning'
                    ? 'Needs attention'
                    : 'Critical'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Texture</p>
            <span className="font-medium text-foreground">{data.texture}</span>
          </div>
        </div>

        {/* pH Scale */}
        <div className="mt-3">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500">
            <div
              className="absolute top-0 h-full w-1 bg-white shadow-lg"
              style={{ left: `${((Number(data.ph) - 4) / 6) * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>4 (Acidic)</span>
            <span>7 (Neutral)</span>
            <span>10 (Alkaline)</span>
          </div>
        </div>
      </div>

      {/* Nutrients Grid */}
      <div className="grid grid-cols-2 gap-3">
        {nutrients.map((nutrient) => (
          <div
            key={nutrient.name}
            className="rounded-xl border border-border/50 bg-card/30 p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <nutrient.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {nutrient.name}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-lg font-semibold text-foreground">
                {Number(nutrient.value).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">
                {nutrient.unit}
              </span>
            </div>
            <Progress
              value={Math.round((Number(nutrient.value) / nutrient.max) * 10000) / 100}
              className="mt-2 h-1.5"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
