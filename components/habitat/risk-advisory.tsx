"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Droplets,
  Sun,
  CloudRain,
  Leaf,
  Droplet,
  Shield,
  Activity,
  Shovel,
} from "lucide-react";
import type { RiskAdvisory as RiskAdvisoryType } from "@/lib/types";

interface RiskAdvisoryProps {
  data: RiskAdvisoryType;
}

const riskIcons: Record<string, React.ReactNode> = {
  drought: <Sun className="h-5 w-5" />,
  flood: <CloudRain className="h-5 w-5" />,
  heat_stress: <Sun className="h-5 w-5" />,
  frost: <Droplets className="h-5 w-5" />,
  pest: <AlertTriangle className="h-5 w-5" />,
};

const riskColors: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  moderate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  severe: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const priorityColors: Record<string, string> = {
  immediate: "bg-rose-500/20 text-rose-400",
  "short-term": "bg-amber-500/20 text-amber-400",
  "long-term": "bg-emerald-500/20 text-emerald-400",
};

const categoryIcons: Record<string, React.ReactNode> = {
  irrigation: <Droplet className="h-4 w-4" />,
  soil: <Shovel className="h-4 w-4" />,
  protection: <Shield className="h-4 w-4" />,
  drainage: <Droplets className="h-4 w-4" />,
  monitoring: <Activity className="h-4 w-4" />,
};

export function RiskAdvisory({ data }: RiskAdvisoryProps) {
  const hasRisks = data.risks.some((r) => r.level !== "low");

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          Risk Advisory & Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Alerts */}
        <div>
          <h4 className="text-sm font-medium text-slate-400 mb-3">
            Environmental Risks
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.risks.map((risk) => (
              <div
                key={risk.type}
                className={`rounded-lg border p-3 ${riskColors[risk.level]}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {riskIcons[risk.type]}
                  <span className="font-medium capitalize">
                    {risk.type.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {risk.level}
                  </Badge>
                  <span className="text-sm font-bold">{risk.probability}%</span>
                </div>
                <p className="text-xs opacity-80 mt-2">{risk.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Species */}
        {hasRisks && data.recommendedSpecies.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-400" />
              Recommended Species for Current Conditions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.recommendedSpecies.map((species) => (
                <div
                  key={species.name}
                  className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-emerald-300">
                      {species.name}
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-400">
                      {species.suitability}% match
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    {species.reason}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <Droplet className="h-3 w-3 text-blue-400" />
                    <span className="text-slate-500">
                      Water:{" "}
                      <span className="text-slate-300">
                        {species.waterRequirement}
                      </span>
                    </span>
                    {species.droughtTolerance && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-500">
                          Drought:{" "}
                          <span className="text-slate-300">
                            {species.droughtTolerance}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solutions */}
        {hasRisks && data.solutions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              Recommended Actions & Solutions
            </h4>
            <div className="space-y-2">
              {data.solutions.map((solution, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-slate-700/50 text-slate-300">
                    {categoryIcons[solution.category]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-200">
                        {solution.title}
                      </span>
                      <Badge
                        className={`text-xs ${
                          priorityColors[solution.priority]
                        }`}
                      >
                        {solution.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs capitalize text-slate-400"
                      >
                        {solution.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      {solution.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No significant risks message */}
        {!hasRisks && (
          <div className="text-center py-4 text-emerald-400">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-60" />
            <p className="text-sm">
              No significant environmental risks detected. Conditions are
              favorable.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
