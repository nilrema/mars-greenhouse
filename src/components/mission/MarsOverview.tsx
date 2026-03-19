import { motion } from 'framer-motion';
import type { ModuleSummary } from './types';

const statusStyles = {
  nominal: 'bg-success text-success',
  watch: 'bg-warning text-warning',
  alert: 'bg-destructive text-destructive',
};

export function MarsOverview({
  modules,
  selectedModuleId,
  onSelectModule,
}: {
  modules: ModuleSummary[];
  selectedModuleId: string;
  onSelectModule: (moduleId: string) => void;
}) {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">Module Network</div>
      <div className="flex-1 relative overflow-hidden rounded tactical-grid bg-muted/20 border border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(62,74,158,0.08),transparent_45%),radial-gradient(circle_at_75%_65%,rgba(0,158,96,0.08),transparent_35%)]" />

        {modules.map((module, index) => {
          const selected = module.id === selectedModuleId;
          const style = positions[index] ?? positions[0];
          const statusClass = statusStyles[module.statusLabel];

          return (
            <motion.button
              key={module.id}
              type="button"
              onClick={() => onSelectModule(module.id)}
              className={`absolute border rounded-md bg-card/95 px-3 py-2 text-left shadow-sm transition-all ${
                selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
              }`}
              style={style}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center gap-2">
                <div className={`status-led ${statusClass.split(' ')[0]}`} />
                <div className="text-[11px] font-semibold text-foreground">{module.name}</div>
              </div>
              <div className="text-[9px] text-muted-foreground mt-1">{module.location}</div>
              <div className="mt-2 flex items-center justify-between gap-3 text-[9px]">
                <span className={statusClass.split(' ')[1]}>{module.statusLabel.toUpperCase()}</span>
                <span className="text-muted-foreground">Harvest {module.harvestScore}</span>
              </div>
            </motion.button>
          );
        })}

        <div className="absolute bottom-2 left-2 text-[9px] text-muted-foreground">
          Command network: 3 active agricultural modules
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {modules.map((module) => (
          <div key={module.id} className="border border-border rounded p-2 bg-background/50">
            <div className="text-[9px] text-muted-foreground">{module.name}</div>
            <div className="text-[11px] font-medium text-foreground mt-1">{module.alert}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const positions = [
  { left: '12%', top: '22%', width: '36%' },
  { left: '50%', top: '48%', width: '34%' },
  { left: '26%', top: '68%', width: '38%' },
];
