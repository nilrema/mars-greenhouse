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

function toChatApiError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeGraphqlError = error as SubmitChatMessageGraphQLResponse & { errors?: Array<{ message?: string }> };
    const firstMessage = maybeGraphqlError.errors?.[0]?.message;

    if (firstMessage) {
      return new Error(firstMessage);
    }
  }

  return new Error('Unable to reach mission control right now.');
}

export async function submitChatMessage(
  request: SubmitChatMessageRequest,
): Promise<SubmitChatMessageResponse> {
  const validatedRequest = submitChatMessageRequestSchema.parse(request);

  try {
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
  } catch (error) {
    throw toChatApiError(error);
  }
}
