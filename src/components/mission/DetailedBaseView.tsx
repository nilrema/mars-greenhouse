import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MarsBase, GreenhouseZone, AstronautClone } from './types';
import { BaseSummaryPanel } from './BaseSummaryPanel';
import { GreenhouseMapPanel } from './GreenhouseMapPanel';
import { ActionPanel } from './ActionPanel';
import { generateZones, clones as initialClones, getAgentRecommendations } from './greenhouseData';

interface Props {
  base: MarsBase;
  onBack: () => void;
}

export function DetailedBaseView({ base, onBack }: Props) {
  const [zones, setZones] = useState<GreenhouseZone[]>(() => generateZones(base.id));
  const [cloneState, setCloneState] = useState<AstronautClone[]>(initialClones.map(c => ({ ...c })));
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const activeZone = useMemo(() => zones.find(z => z.id === selectedZone) || null, [zones, selectedZone]);
  const recommendations = useMemo(() => getAgentRecommendations(base.id, selectedZone), [base.id, selectedZone]);

  const handleSelectZone = useCallback((id: string | null) => {
    setSelectedZone(id);
    setZoomLevel(id ? 1 : 1);
  }, []);

  const handleDeployClone = useCallback((cloneId: string, zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;

    // Clone walks to zone
    setCloneState(prev => prev.map(c =>
      c.id === cloneId ? { ...c, status: 'walking' as const, assignedZone: zoneId, x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 } : c
    ));

    // After arrival, start harvesting
    setTimeout(() => {
      setCloneState(prev => prev.map(c =>
        c.id === cloneId ? { ...c, status: 'harvesting' as const } : c
      ));
    }, 2000);

    // After harvesting, update zone and return clone
    setTimeout(() => {
      setZones(prev => prev.map(z => {
        if (z.id !== zoneId) return z;
        const newRisk = Math.max(0, z.diseaseRisk - 10);
        const newConf = Math.min(100, z.inspectionConfidence + 15);
        const newStatus = newRisk < 15 ? 'healthy' as const : z.status;
        return { ...z, diseaseRisk: newRisk, inspectionConfidence: newConf, status: newStatus };
      }));

      setCloneState(prev => prev.map(c =>
        c.id === cloneId ? { ...c, status: 'returning' as const } : c
      ));

      setTimeout(() => {
        const original = initialClones.find(c => c.id === cloneId)!;
        setCloneState(prev => prev.map(c =>
          c.id === cloneId ? { ...c, status: 'idle' as const, assignedZone: null, x: original.x, y: original.y } : c
        ));
      }, 1500);
    }, 4500);
  }, [zones]);

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-card shrink-0">
        <button
          onClick={onBack}
          className="text-[11px] text-primary hover:text-primary/80 transition-colors border border-primary/30 px-2.5 py-1 rounded hover:bg-primary/5"
        >
          ← Command Center
        </button>
        <div className="h-3 w-px bg-border" />
        <span className="text-[12px] text-foreground font-medium">
          {base.name}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {base.label}
        </span>
      </div>

      <div className="flex-1 flex min-h-0 p-2 gap-2">
        <div className="w-[22%] min-h-0">
          <BaseSummaryPanel base={base} zones={zones} />
        </div>

        <div className="w-[48%] min-h-0">
          <GreenhouseMapPanel
            zones={zones}
            clones={cloneState}
            selectedZone={selectedZone}
            onSelectZone={handleSelectZone}
            zoomLevel={zoomLevel}
          />
        </div>

        <div className="w-[30%] min-h-0">
          <ActionPanel
            zone={activeZone}
            clones={cloneState}
            recommendations={recommendations}
            onDeployClone={handleDeployClone}
            zoomLevel={zoomLevel}
            onSetZoom={setZoomLevel}
          />
        </div>
      </div>
    </motion.div>
  );
}
