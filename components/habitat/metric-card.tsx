"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  isLoading?: boolean;
  status?: "healthy" | "warning" | "critical";
  impact?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  isLoading,
  status = "healthy",
  impact,
}: MetricCardProps) {
  const [showImpact, setShowImpact] = useState(false);

  const statusColors = {
    healthy: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    critical: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };

  const trendColors = {
    up: "text-emerald-500",
    down: "text-rose-500",
    stable: "text-muted-foreground",
  };

  const hasImpact = impact && status !== "healthy";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:border-primary/30 hover:bg-card/80">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg border",
              statusColors[status]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          {trend && trendValue && !isLoading && (
            <span className={cn("text-xs font-medium", trendColors[trend])}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
            </span>
          )}
        </div>

        <div className="mt-3">
          <p className="text-xs text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-2xl font-semibold text-foreground">
                {value}
              </span>
              {unit && (
                <span className="text-sm text-muted-foreground">{unit}</span>
              )}
            </div>
          )}
        </div>

        {/* Impact Section */}
        {hasImpact && !isLoading && (
          <div className="mt-2">
            <button
              onClick={() => setShowImpact(!showImpact)}
              className={cn(
                "flex w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                status === "critical"
                  ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              )}
            >
              <AlertCircle className="h-3 w-3" />
              <span>Impact</span>
              {showImpact ? (
                <ChevronUp className="ml-auto h-3 w-3" />
              ) : (
                <ChevronDown className="ml-auto h-3 w-3" />
              )}
            </button>
            {showImpact && (
              <div
                className={cn(
                  "mt-2 rounded-md p-2 text-xs leading-relaxed",
                  status === "critical"
                    ? "bg-rose-500/10 text-rose-300"
                    : "bg-amber-500/10 text-amber-300"
                )}
              >
                {impact}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
