import { motion } from 'framer-motion';
import type { GreenhouseZone, AstronautClone } from './types';

const zoneColors: Record<string, { border: string; bg: string; text: string; fill: string }> = {
  healthy: { border: 'border-success/40', bg: 'bg-success/8', text: 'text-success', fill: 'hsl(var(--success))' },
  warning: { border: 'border-warning/60', bg: 'bg-warning/8', text: 'text-warning', fill: 'hsl(var(--warning))' },
  critical: { border: 'border-destructive/60', bg: 'bg-destructive/10', text: 'text-destructive', fill: 'hsl(var(--destructive))' },
  quarantined: { border: 'border-destructive/40', bg: 'bg-destructive/5', text: 'text-destructive', fill: 'hsl(var(--destructive))' },
};

const zoneTypeIcons: Record<string, string> = {
  growing: '🌾',
  nutrient: '🧪',
  storage: '📦',
  quarantine: '⚠',
  airlock: '🚪',
};

interface Props {
  zones: GreenhouseZone[];
  clones: AstronautClone[];
  selectedZone: string | null;
  onSelectZone: (id: string | null) => void;
  zoomLevel: number;
}

export function GreenhouseMapPanel({ zones, clones, selectedZone, onSelectZone, zoomLevel }: Props) {
  const focusedZone = zones.find(z => z.id === selectedZone);
  const scale = zoomLevel === 2 ? 2.2 : 1;
  const translateX = focusedZone && zoomLevel === 2 ? -(focusedZone.x + focusedZone.w / 2 - 50) * 2.2 : 0;
  const translateY = focusedZone && zoomLevel === 2 ? -(focusedZone.y + focusedZone.h / 2 - 50) * 2.2 : 0;

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="panel-header flex items-center justify-between">
        <span>Greenhouse Layout — Live</span>
        <span className="text-[9px] text-muted-foreground">
          Zoom: L{zoomLevel} {zoomLevel === 2 && focusedZone ? `· ${focusedZone.name}` : ''}
        </span>
      </div>

      <div className="flex-1 relative overflow-hidden border border-border rounded bg-muted/20">
        {/* Grid background */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="field-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#field-grid)" />
        </svg>

        <motion.div
          className="absolute inset-0"
          animate={{ scale, x: translateX, y: translateY }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ transformOrigin: 'center center' }}
        >
          {/* Zones */}
          {zones.map((zone) => {
            const colors = zoneColors[zone.status];
            const isSelected = zone.id === selectedZone;
            const icon = zoneTypeIcons[zone.type] || '·';

            return (
              <motion.button
                key={zone.id}
                className={`absolute border ${colors.border} ${colors.bg} rounded transition-all duration-200 group
                  ${isSelected ? 'ring-2 ring-primary z-20 shadow-md' : 'hover:brightness-110 z-10'}`}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`,
                }}
                onClick={() => onSelectZone(isSelected ? null : zone.id)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Crop row lines for growing zones */}
                {zone.type === 'growing' && (
                  <div className="absolute inset-2 flex flex-col justify-between opacity-20 pointer-events-none">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-full border-b border-dashed border-success" />
                    ))}
                  </div>
                )}

                {/* Pulsing border for warning/critical */}
                {(zone.status === 'warning' || zone.status === 'critical') && (
                  <motion.div
                    className={`absolute inset-0 rounded border ${zone.status === 'critical' ? 'border-destructive' : 'border-warning'}`}
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}

                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 z-10">
                  <span className="text-sm mb-0.5">{icon}</span>
                  <span className={`text-[9px] ${colors.text} font-medium leading-tight text-center`}>
                    {zone.type === 'growing' ? zone.crop : zone.type.charAt(0).toUpperCase() + zone.type.slice(1)}
                  </span>
                  {zone.type === 'growing' && zone.growthStage && (
                    <span className="text-[7px] text-muted-foreground mt-0.5">
                      {zone.growthStage.charAt(0).toUpperCase() + zone.growthStage.slice(1)}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}

          {/* Astronaut Clones */}
          {clones.map(clone => (
            <motion.div
              key={clone.id}
              className="absolute z-30 pointer-events-none"
              animate={{ left: `${clone.x}%`, top: `${clone.y}%` }}
              transition={{ type: 'spring', damping: 12, stiffness: 60, duration: 2 }}
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative flex flex-col items-center">
                {/* Clone avatar */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px]
                  ${clone.status === 'idle'
                    ? 'border-success/60 bg-success/15'
                    : clone.status === 'harvesting'
                      ? 'border-warning/60 bg-warning/15'
                      : 'border-primary/60 bg-primary/15'
                  }`}
                >
                  🧑‍🚀
                </div>
                {/* Name label */}
                <span className="text-[6px] text-muted-foreground mt-0.5 whitespace-nowrap">{clone.name}</span>
                {/* Activity ring */}
                {clone.status !== 'idle' && (
                  <motion.div
                    className="absolute -inset-1 border border-primary/50 rounded-full"
                    animate={{ opacity: [1, 0.3, 1], scale: [1, 1.25, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-1.5 px-1">
        {(['healthy', 'warning', 'critical', 'quarantined'] as const).map(s => (
          <div key={s} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-sm ${zoneColors[s].bg} border ${zoneColors[s].border}`} />
            <span className="text-[8px] text-muted-foreground">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
