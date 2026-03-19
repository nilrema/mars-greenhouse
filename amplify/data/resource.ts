import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { chatResponder } from '../functions/chatResponder/resource';

const schema = a.schema({
  ChatRequestContext: a.customType({
    temperatureDrift: a.float(),
    waterRecycling: a.float(),
    powerAvailability: a.float(),
  }),

  ChatAgentStatus: a.customType({
    id: a.string().required(),
    name: a.string().required(),
    role: a.string().required(),
    icon: a.string().required(),
    status: a.string().required(),
    currentAction: a.string().required(),
  }),

  ChatAgentMessage: a.customType({
    id: a.string().required(),
    agentId: a.string().required(),
    agentName: a.string().required(),
    agentRole: a.string().required(),
    severity: a.string().required(),
    message: a.string().required(),
    timestamp: a.integer().required(),
  }),

  ChatResponse: a.customType({
    conversationId: a.string().required(),
    requestId: a.string().required(),
    agentStatuses: a.ref('ChatAgentStatus').array().required(),
    messages: a.ref('ChatAgentMessage').array().required(),
  }),

  submitChatMessage: a
    .mutation()
    .arguments({
      message: a.string().required(),
      conversationId: a.string(),
      context: a.ref('ChatRequestContext'),
    })
    .returns(a.ref('ChatResponse'))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(chatResponder)),

  SensorReading: a
    .model({
      greenhouseId: a.string().required(),
      timestamp: a.datetime().required(),
      temperature: a.float(),
      humidity: a.float(),
      co2Ppm: a.integer(),
      lightPpfd: a.float(),
      phLevel: a.float(),
      nutrientEc: a.float(),
      waterLitres: a.float(),
      radiationMsv: a.float(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  CropRecord: a
    .model({
      cropId: a.string().required(),
      name: a.string().required(),
      variety: a.string(),
      plantedAt: a.datetime(),
      growthStage: a.integer(),
      daysToHarvest: a.integer(),
      healthStatus: a.enum(['HEALTHY', 'MONITOR', 'CRITICAL']),
      zone: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  AgentEvent: a
    .model({
      agentId: a.string().required(),
      timestamp: a.datetime().required(),
      severity: a.enum(['INFO', 'WARN', 'CRITICAL']),
      message: a.string(),
      actionTaken: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  ModuleSummary: a
    .model({
      moduleId: a.string().required(),
      name: a.string().required(),
      location: a.string(),
      status: a.enum(['NOMINAL', 'WATCH', 'ALERT']),
      alert: a.string(),
      harvestScore: a.integer(),
      resourcePressure: a.integer(),
      astroImpact: a.integer(),
      activeScenario: a.string(),
      orchestratorSummary: a.string(),
      leadAgent: a.string(),
      updatedAtLabel: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  AgentSnapshot: a
    .model({
      moduleId: a.string().required(),
      agentId: a.string().required(),
      status: a.enum(['NOMINAL', 'WATCH', 'ALERT']),
      headline: a.string(),
      riskScore: a.integer(),
      recommendations: a.json(),
      affectedModules: a.json(),
      timestamp: a.datetime(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  ScenarioEvent: a
    .model({
      scenarioId: a.string().required(),
      label: a.string().required(),
      summary: a.string(),
      leadAgent: a.string(),
      affectedModules: a.json(),
      severity: a.enum(['INFO', 'WARN', 'CRITICAL']),
      triggeredAt: a.datetime(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  ActionRequest: a
    .model({
      type: a.string().required(),
      moduleId: a.string().required(),
      sectionId: a.string(),
      requestedBy: a.string(),
      assignedAgent: a.string(),
      status: a.enum(['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED']),
      summary: a.string(),
      createdAtLabel: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  ActuatorCommand: a
    .model({
      commandId: a.string().required(),
      type: a.enum([
        'TEMPERATURE_ADJUST',
        'HUMIDITY_ADJUST',
        'IRRIGATION_TRIGGER',
        'LIGHTING_ADJUST',
        'CO2_ADJUST',
      ]),
      targetValue: a.float(),
      zone: a.string().required(),
      unit: a.string(),
      durationSeconds: a.integer(),
      status: a.enum(['PENDING', 'EXECUTING', 'COMPLETED', 'FAILED']),
      executedAt: a.datetime(),
      result: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
