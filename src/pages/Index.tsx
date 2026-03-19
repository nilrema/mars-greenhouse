import { TopNav } from '@/components/mission/TopNav';
import { GreenhouseFeed } from '@/components/mission/GreenhouseFeed';
import { GreenhouseOverview } from '@/components/mission/GreenhouseOverview';
import { AgentChatPanel } from '@/components/mission/AgentChatPanel';
import { useMissionState } from '@/components/mission/useMissionState';

const Index = () => {
  const { base, astronauts, agents, chatMessages, isChatLoading, runSimulation, simParams, sendChatMessage } = useMissionState();
  const chaosActive =
    simParams.temperatureDrift !== 0 || simParams.waterRecycling !== 100 || simParams.powerAvailability !== 100;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <TopNav chaosActive={chaosActive} simParams={simParams} onSimChange={runSimulation} />

      <div className="flex-1 flex min-h-0 gap-2 p-2">
        <div className="w-[24%] min-h-0">
          <GreenhouseFeed base={base} />
        </div>

        <div className="w-[48%] min-h-0">
          <GreenhouseOverview base={base} astronauts={astronauts} />
        </div>

        <div className="w-[28%] min-h-0">
          <AgentChatPanel
            agents={agents}
            messages={chatMessages}
            isLoading={isChatLoading}
            onSendMessage={sendChatMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
