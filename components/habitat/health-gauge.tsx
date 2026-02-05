"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Leaf,
  Droplets,
  Thermometer,
  Wind,
  TreeDeciduous,
  FlaskConical,
} from "lucide-react";

interface HealthBreakdown {
  vegetation?: { value: number; contribution: number; status: string };
  moisture?: { value: number; contribution: number; status: string };
  temperature?: { value: number; contribution: number; status: string };
  air_quality?: { value: number; contribution: number; status: string };
  forest_cover?: { value: number; contribution: number; status: string };
  soil_health?: { value: number; contribution: number; status: string };
}

interface HealthGaugeProps {
  score: number;
  isLoading?: boolean;
  simulatedScore?: number;
  breakdown?: HealthBreakdown;
  calculationDescription?: string;
}

const breakdownIcons: Record<string, React.ReactNode> = {
  vegetation: <Leaf className="h-3 w-3" />,
  moisture: <Droplets className="h-3 w-3" />,
  temperature: <Thermometer className="h-3 w-3" />,
  air_quality: <Wind className="h-3 w-3" />,
  forest_cover: <TreeDeciduous className="h-3 w-3" />,
  soil_health: <FlaskConical className="h-3 w-3" />,
};

const breakdownLabels: Record<string, string> = {
  vegetation: "Vegetation (NDVI)",
  moisture: "Moisture",
  temperature: "Temperature",
  air_quality: "Air Quality",
  forest_cover: "Forest Cover",
  soil_health: "Soil Health",
};

export function HealthGauge({
  score,
  isLoading,
  simulatedScore,
  breakdown,
  calculationDescription,
}: HealthGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const displayScore = simulatedScore ?? score;

  useEffect(() => {
    if (isLoading) {
      setAnimatedScore(0);
      return;
    }

    const duration = 1500;
    const steps = 60;
    const increment = displayScore / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= displayScore) {
        setAnimatedScore(displayScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [displayScore, isLoading]);

  const getScoreColor = (s: number) => {
    if (s >= 70) return "text-emerald-500";
    if (s >= 40) return "text-amber-500";
    return "text-rose-500";
  };

  const getStrokeColor = (s: number) => {
    if (s >= 70) return "#10b981";
    if (s >= 40) return "#f59e0b";
    return "#f43f5e";
  };

  const getStatusColor = (status: string) => {
    if (status === "good") return "text-emerald-400 bg-emerald-500/10";
    if (status === "moderate") return "text-amber-400 bg-amber-500/10";
    return "text-rose-400 bg-rose-500/10";
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset =
    circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-32 w-32">
        {/* Background circle */}
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            cx="64"
            cy="64"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          {/* Progress circle */}
          {!isLoading && (
            <circle
              cx="64"
              cy="64"
              r="45"
              fill="none"
              stroke={getStrokeColor(displayScore)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 8px ${getStrokeColor(
                  displayScore
                )}50)`,
              }}
            />
          )}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="h-10 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <>
              <span
                className={cn(
                  "font-mono text-3xl font-bold transition-colors",
                  getScoreColor(displayScore)
                )}
              >
                {animatedScore}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 text-center">
        <p className="text-sm font-medium text-foreground">Ecosystem Health</p>
        {!isLoading && (
          <p
            className={cn(
              "text-xs",
              displayScore >= 70
                ? "text-emerald-500"
                : displayScore >= 40
                ? "text-amber-500"
                : "text-rose-500"
            )}
          >
            {displayScore >= 70
              ? "Healthy"
              : displayScore >= 40
              ? "Moderate"
              : "Critical"}
          </p>
        )}
      </div>

      {/* How it's calculated button */}
      {breakdown && !isLoading && (
        <div className="mt-3 w-full">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex w-full items-center justify-center gap-1 rounded-md bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <Info className="h-3 w-3" />
            <span>How is this calculated?</span>
            {showBreakdown ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {showBreakdown && (
            <div className="mt-3 space-y-2 rounded-lg bg-muted/30 p-3">
              {calculationDescription && (
                <p className="text-xs text-muted-foreground mb-3 pb-2 border-b border-border/50">
                  {calculationDescription}
                </p>
              )}
              {Object.entries(breakdown).map(([key, data]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center justify-center h-5 w-5 rounded",
                      getStatusColor(data.status)
                    )}
                  >
                    {breakdownIcons[key]}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {breakdownLabels[key] || key}
                      </span>
                      <span className="font-mono text-foreground">
                        +{data.contribution.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          data.status === "good"
                            ? "bg-emerald-500"
                            : data.status === "moderate"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        )}
                        style={{
                          width: `${Math.min(100, data.contribution * 4)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-border/50 flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Total Score</span>
                <span className={getScoreColor(displayScore)}>
                  {displayScore}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
