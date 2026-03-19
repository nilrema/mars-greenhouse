import { defineFunction } from '@aws-amplify/backend';

export const sensorSimulator = defineFunction({
  name: 'sensorSimulator',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
});
