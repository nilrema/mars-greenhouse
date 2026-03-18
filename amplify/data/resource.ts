import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
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
