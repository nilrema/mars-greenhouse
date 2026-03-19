import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GreenhouseZone, AstronautClone, AgentRecommendation } from './types';

const statusBadge: Record<string, string> = {
  healthy: 'text-success border-success/40',
  warning: 'text-warning border-warning/40',
  critical: 'text-destructive border-destructive/40',
  quarantined: 'text-destructive border-destructive/40',
};

const roleLabels: Record<string, string> = {
  harvester: 'Harvest bay',
  inspector: 'Inspect zone',
  technician: 'Stabilize systems',
};

interface Props {
  zone: GreenhouseZone | null;
  clones: AstronautClone[];
  recommendations: AgentRecommendation[];
  onDeployClone: (cloneId: string, zoneId: string) => void;
  zoomLevel: number;
  onSetZoom: (level: number) => void;
}

export function ActionPanel({ zone, clones, recommendations, onDeployClone, zoomLevel, onSetZoom }: Props) {
  const [deployingId, setDeployingId] = useState<string | null>(null);

  const handleDeploy = (cloneId: string) => {
    if (!zone) return;
    setDeployingId(cloneId);
    onDeployClone(cloneId, zone.id);
    setTimeout(() => setDeployingId(null), 3000);
  };

  return (
    <div className="panel h-full flex flex-col overflow-y-auto">
      <div className="panel-header">Section Analysis & Dispatch</div>

      <AnimatePresence mode="wait">
        {!zone ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center">
            <div className="text-center text-[10px] text-muted-foreground/50">
              Select a zone to inspect
            </div>
          </motion.div>
        ) : (
          <motion.div key={zone.id} initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }} className="flex-1 flex flex-col gap-2">
            {/* Zone header */}
            <div className="border border-border bg-background/50 p-2.5 rounded">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-primary font-medium">{zone.name}</span>
                <span className={`text-[9px] border px-1.5 py-0.5 rounded ${statusBadge[zone.status]}`}>
                  {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                </span>
              </div>
              <div className="text-[9px] text-muted-foreground">
                Type: {zone.type.charAt(0).toUpperCase() + zone.type.slice(1)} {zone.crop ? `· Crop: ${zone.crop}` : ''}
              </div>
            </div>

            {/* Zoom control */}
            <div className="flex gap-1.5">
              {[1, 2].map(l => (
                <button
                  key={l}
                  onClick={() => onSetZoom(l)}
                  className={`flex-1 text-[10px] py-1.5 border rounded transition-colors
                    ${zoomLevel === l ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                >
                  {l === 1 ? 'Overview' : 'Zoom In'}
                </button>
              ))}
            </div>

            {/* Sensor readings */}
            {zone.type === 'growing' && (
              <>
                <div className="panel-header">Sensor Data</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <SensorCard label="Humidity" value={`${zone.humidity}%`} warn={zone.humidity > 78} />
                  <SensorCard label="Temp" value={`${zone.temperature}°C`} />
                  <SensorCard label="CO₂" value={`${zone.co2}`} unit="ppm" />
                  <SensorCard label="Water Uptake" value={`${zone.waterUptake}%`} />
                  <SensorCard label="Nutrient" value={zone.nutrientStatus?.charAt(0).toUpperCase() + (zone.nutrientStatus?.slice(1) || '') || 'N/A'} warn={zone.nutrientStatus === 'warning'} />
                  <SensorCard label="Growth" value={zone.growthStage?.charAt(0).toUpperCase() + (zone.growthStage?.slice(1) || '') || 'N/A'} />
                </div>

                <div className="panel-header">Anomaly Detection</div>
                <div className="border border-border bg-background/50 p-2.5 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] text-muted-foreground">Disease Risk</span>
                    <span className={`font-mono text-[10px] tabular-nums ${zone.diseaseRisk > 20 ? 'text-warning' : 'text-success'}`}>
                      {zone.diseaseRisk}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full mb-2">
                    <motion.div
                      className={`h-full rounded-full ${zone.diseaseRisk > 30 ? 'bg-destructive' : zone.diseaseRisk > 15 ? 'bg-warning' : 'bg-success'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${zone.diseaseRisk}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-muted-foreground">Inspection Confidence</span>
                    <span className="font-mono text-[10px] tabular-nums text-foreground">{zone.inspectionConfidence}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                    <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${zone.inspectionConfidence}%` }} />
                  </div>

                  {zone.predictedYield !== undefined && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="flex justify-between">
                        <span className="text-[9px] text-muted-foreground">Yield Forecast</span>
                        <span className="font-mono text-[10px] text-foreground tabular-nums">{zone.predictedYield}kg</span>
                      </div>
                    </div>
                  )}
                </div>

                {zoomLevel === 2 && (
                  <div className="border border-border bg-background/30 p-2 rounded">
                    <div className="panel-header mb-1">Visual Feed</div>
                    <div className="relative h-16 bg-muted/30 border border-border rounded overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-[9px] text-primary">Live Feed</div>
                          <div className="text-[8px] text-muted-foreground">{zone.crop} — {zone.growthStage}</div>
                        </div>
                      </div>
                      {zone.diseaseRisk > 20 && (
                        <motion.div
                          className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-destructive bg-destructive/20"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Clone deployment */}
            <div className="panel-header">Dispatch Teams</div>
            <div className="space-y-1">
              {clones.map(clone => {
                const isDeploying = deployingId === clone.id || clone.status !== 'idle';
                return (
                  <button
                    key={clone.id}
                    onClick={() => handleDeploy(clone.id)}
                    disabled={isDeploying || !zone}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 border rounded transition-colors text-[10px]
                      ${isDeploying
                        ? 'border-primary/30 bg-primary/5 text-primary cursor-not-allowed'
                        : 'border-border hover:border-primary hover:bg-primary/5 text-foreground cursor-pointer'
                      } disabled:opacity-40`}
                  >
                    <span className="text-sm">🧑‍🚀</span>
                    <span className="font-medium">{clone.name}</span>
                    <span className="text-muted-foreground ml-auto text-[9px]">
                      {isDeploying
                        ? (clone.status === 'harvesting' ? 'Harvesting…' : clone.status === 'walking' ? 'Walking…' : 'Returning…')
                        : roleLabels[clone.role]}
                    </span>
                  </button>
                );
              })}
            </div>

            {zone.status !== 'healthy' && (
              <button className="w-full flex items-center justify-center gap-2 px-2 py-1.5 border border-warning/50 bg-warning/5 text-warning text-[10px] rounded hover:bg-warning/10 transition-colors">
                ⚠ Quarantine Zone
              </button>
            )}

            <div className="panel-header">Specialist Recommendations</div>
            <div className="space-y-1">
              {recommendations.map((rec, i) => (
                <motion.div
                  key={`${rec.agent}-${i}`}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="border-l-2 border-border pl-2.5 py-0.5"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[9px]">{rec.icon}</span>
                    <span className="text-[9px] text-primary font-medium">{rec.agent}</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground leading-relaxed">{rec.message}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SensorCard({ label, value, unit, warn }: { label: string; value: string; unit?: string; warn?: boolean }) {
  return (
    <div className="border border-border bg-background/50 p-1.5 rounded">
      <div className="text-[8px] text-muted-foreground mb-0.5">{label}</div>
      <div className={`font-mono text-[10px] tabular-nums ${warn ? 'text-warning' : 'text-foreground'}`}>
        {value} {unit && <span className="text-[8px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
