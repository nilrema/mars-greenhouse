import { TopNav } from '@/components/mission/TopNav';
import { GreenhouseFeed } from '@/components/mission/GreenhouseFeed';
import { GreenhouseOverview } from '@/components/mission/GreenhouseOverview';
import { AgentChatPanel } from '@/components/mission/AgentChatPanel';
import { useMissionState } from '@/components/mission/useMissionState';

const Index = () => {
  const { base, astronauts, agents, logs, metrics, simParams, updateSimulation } = useMissionState();
  const chaosActive =
    simParams.temperatureDrift !== 0 || simParams.waterRecycling !== 100 || simParams.powerAvailability !== 100;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <TopNav chaosActive={chaosActive} simParams={simParams} onSimChange={updateSimulation} />

      <div className="flex-1 flex min-h-0 p-2 gap-2">
        <div className="w-[20%] min-h-0">
          <GreenhouseFeed base={base} />
        </div>

        <div className="w-[52%] min-h-0">
          <GreenhouseOverview base={base} astronauts={astronauts} />
        </div>

        <div className="w-[28%] min-h-0">
          <AgentChatPanel agents={agents} logs={logs} />
        </div>
      </div>

      <div className="px-2 pb-2">
        <div className="panel flex items-center justify-between py-2">
          <div className="flex items-center gap-6">
            <BottomMetric label="Nutrition" value={metrics.nutritionScore} unit="/100" critical={metrics.nutritionScore < 75} />
            <BottomMetric label="Meal Diversity" value={metrics.mealDiversity} unit="/100" critical={metrics.mealDiversity < 60} />
            <BottomMetric label="Food Security" value={`${metrics.foodSecurityDays}`} unit="sols" critical={metrics.foodSecurityDays < 100} />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Crew Risk</span>
              <span
                className={`text-[11px] font-semibold ${
                  metrics.crewHealthRisk === 'nominal'
                    ? 'text-success'
                    : metrics.crewHealthRisk === 'warning'
                      ? 'text-warning'
                      : 'text-destructive'
                }`}
              >
                {metrics.crewHealthRisk.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function BottomMetric({
  label,
  value,
  unit,
  critical,
}: {
  label: string;
  value: number | string;
  unit: string;
  critical: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[12px] font-mono font-semibold ${critical ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </span>
      <span className="text-[9px] text-muted-foreground">{unit}</span>
    </div>
  );
}

export default Index;
