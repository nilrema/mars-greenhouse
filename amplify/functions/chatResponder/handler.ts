import type { AppSyncResolverEvent } from 'aws-lambda';
import type { SubmitChatMessageRequest, SubmitChatMessageResponse } from '../../../src/components/mission/chatContract';
import { buildChatResponse } from './chatEngine';

export const handler = async (
  event: AppSyncResolverEvent<SubmitChatMessageRequest>,
): Promise<SubmitChatMessageResponse> => {
  console.log('Chat responder invoked:', JSON.stringify(event.arguments, null, 2));

  return await buildChatResponse(event.arguments);
};
