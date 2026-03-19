import { defineFunction } from '@aws-amplify/backend';

export const sensorSimulator = defineFunction({
  name: 'sensorSimulator',
  entry: './handler.ts',
  schedule: 'every 1m',
  timeoutSeconds: 30,
  memoryMB: 256,
});
