import { generateClient } from 'aws-amplify/api';
import {
  submitChatMessageRequestSchema,
  submitChatMessageResponseSchema,
  type SubmitChatMessageRequest,
  type SubmitChatMessageResponse,
} from './chatContract';

const client = generateClient();

const submitChatMessageMutation = /* GraphQL */ `
  mutation SubmitChatMessage(
    $message: String!
    $conversationId: String
    $context: ChatRequestContextInput
  ) {
    submitChatMessage(
      message: $message
      conversationId: $conversationId
      context: $context
    ) {
      conversationId
      requestId
      agentStatuses {
        id
        name
        role
        icon
        status
        currentAction
      }
      messages {
        id
        agentId
        agentName
        agentRole
        severity
        message
        timestamp
      }
    }
  }
`;

interface SubmitChatMessageGraphQLResponse {
  data?: {
    submitChatMessage?: unknown;
  };
  errors?: Array<{ message?: string }>;
}

export async function submitChatMessage(
  request: SubmitChatMessageRequest,
): Promise<SubmitChatMessageResponse> {
  const validatedRequest = submitChatMessageRequestSchema.parse(request);
  const response = (await client.graphql({
    query: submitChatMessageMutation,
    variables: validatedRequest,
  })) as SubmitChatMessageGraphQLResponse;

  if (response.errors?.length) {
    throw new Error(response.errors[0]?.message || 'Chat request failed.');
  }

  if (!response.data?.submitChatMessage) {
    throw new Error('Chat response was empty.');
  }

  return submitChatMessageResponseSchema.parse(response.data.submitChatMessage);
}
