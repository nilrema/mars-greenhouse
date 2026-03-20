import { TopNav } from '@/components/mission/TopNav';
import { GreenhouseFeed } from '@/components/mission/GreenhouseFeed';
import { GreenhouseOverview } from '@/components/mission/GreenhouseOverview';
import { AgentChatPanel } from '@/components/mission/AgentChatPanel';
import { ToolCallRail } from '@/components/mission/ToolCallRail';
import { useMissionState } from '@/components/mission/useMissionState';

const Index = () => {
  const { base, astronauts, agentInteractions, agents, chatMessages, isChatLoading, runSimulation, simParams, temperatureRange, toolCallTiles, sendChatMessage } = useMissionState();
  const chaosActive =
    simParams.temperature !== 24 || simParams.waterRecycling !== 100 || simParams.powerAvailability !== 100;
  const hasToolCalls = toolCallTiles.length > 0;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <TopNav chaosActive={chaosActive} simParams={simParams} temperatureRange={temperatureRange} onSimChange={runSimulation} />

      <div className="flex-1 flex min-h-0 gap-2 p-2">
        <div className="w-[24%] min-h-0">
          <GreenhouseFeed base={base} />
        </div>

        <div className={`${hasToolCalls ? 'w-[43%]' : 'w-[48%]'} min-h-0`}>
          <GreenhouseOverview base={base} astronauts={astronauts} />
        </div>

        {hasToolCalls ? (
          <div className="w-[6%] min-h-0">
            <ToolCallRail toolCalls={toolCallTiles} />
          </div>
        ) : null}

        <div className={`${hasToolCalls ? 'w-[27%]' : 'w-[28%]'} min-h-0`}>
          <AgentChatPanel
            agents={agents}
            interactions={agentInteractions}
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
