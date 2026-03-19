import { motion } from 'framer-motion';
import type { HumanMetrics } from './types';

const riskColor = {
  nominal: 'text-success',
  warning: 'text-warning',
  critical: 'text-destructive',
};

const riskLabel = {
  nominal: 'Nominal',
  warning: 'Warning',
  critical: 'Critical',
};

export function HumanImpactPanel({ metrics, recovering }: { metrics: HumanMetrics; recovering: boolean }) {
  return (
    <div className="panel shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="panel-header mb-0">Crew Impact Assessment</div>
        {recovering && (
          <motion.div
            className="text-[10px] text-warning font-medium"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            Recovery in progress
          </motion.div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Metric label="Nutrition Score" value={metrics.nutritionScore} unit="/100" critical={metrics.nutritionScore < 75} />
        <Metric label="Meal Diversity" value={metrics.mealDiversity} unit="/100" critical={metrics.mealDiversity < 60} />
        <Metric label="Food Security" value={metrics.foodSecurityDays} unit="sols" critical={metrics.foodSecurityDays < 100} />
        <div className="border border-border bg-background/50 p-3 rounded">
          <div className="metric-label mb-1">Crew Health Risk</div>
          <motion.div
            className={`metric-value ${riskColor[metrics.crewHealthRisk]}`}
            key={metrics.crewHealthRisk}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {riskLabel[metrics.crewHealthRisk]}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, unit, critical }: { label: string; value: number; unit: string; critical: boolean }) {
  return (
    <div className="border border-border bg-background/50 p-3 rounded">
      <div className="metric-label mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <motion.span
          className={`metric-value ${critical ? 'text-destructive' : 'text-foreground'}`}
          key={value}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {value}
        </motion.span>
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
