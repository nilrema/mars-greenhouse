import {
  submitChatMessageRequestSchema,
  type SubmitChatMessageRequest,
  type SubmitChatMessageResponse,
} from '../../../src/components/mission/chatContract';
import { runChatRuntime } from './chatRuntimeBridge';

export async function buildChatResponse(input: SubmitChatMessageRequest): Promise<SubmitChatMessageResponse> {
  const request = submitChatMessageRequestSchema.parse(input);
  return runChatRuntime(request);
}
