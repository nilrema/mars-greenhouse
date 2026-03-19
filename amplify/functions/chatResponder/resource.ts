import { defineFunction } from '@aws-amplify/backend';

export const chatResponder = defineFunction({
  name: 'chatResponder',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
});
