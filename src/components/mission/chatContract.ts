import { z } from 'zod';

export const agentIdSchema = z.enum(['environment', 'crop', 'astro', 'resource', 'orchestrator']);
export const baseStatusSchema = z.enum(['nominal', 'warning', 'critical']);
export const chatSeveritySchema = z.enum(['info', 'warning', 'critical', 'success']);

export const simulationContextSchema = z.object({
  temperatureDrift: z.number(),
  waterRecycling: z.number(),
  powerAvailability: z.number(),
});

export const submitChatMessageRequestSchema = z.object({
  conversationId: z.string().min(1).nullish(),
  message: z.string().trim().min(1, 'Message is required.').max(1000, 'Message is too long.'),
  context: simulationContextSchema.nullish(),
});

export const agentStatusSnapshotSchema = z.object({
  id: agentIdSchema,
  name: z.string(),
  role: z.string(),
  icon: z.string(),
  status: baseStatusSchema,
  currentAction: z.string(),
});

export const agentResponseMessageSchema = z.object({
  id: z.string(),
  agentId: agentIdSchema,
  agentName: z.string(),
  agentRole: z.string(),
  severity: chatSeveritySchema,
  message: z.string(),
  timestamp: z.number().int(),
});

export const submitChatMessageResponseSchema = z.object({
  conversationId: z.string(),
  requestId: z.string(),
  agentStatuses: z.array(agentStatusSnapshotSchema),
  messages: z.array(agentResponseMessageSchema).min(1),
});

export type SimulationContext = z.infer<typeof simulationContextSchema>;
export type SubmitChatMessageRequest = z.infer<typeof submitChatMessageRequestSchema>;
export type AgentStatusSnapshot = z.infer<typeof agentStatusSnapshotSchema>;
export type AgentResponseMessage = z.infer<typeof agentResponseMessageSchema>;
export type SubmitChatMessageResponse = z.infer<typeof submitChatMessageResponseSchema>;
