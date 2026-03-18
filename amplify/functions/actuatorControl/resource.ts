import { defineFunction } from '@aws-amplify/backend';

export const actuatorControl = defineFunction({
  name: 'actuatorControl',
  entry: './handler.ts',
  environment: {
    ACTUATOR_TABLE: 'ActuatorCommand',
    AWS_REGION: 'us-east-2',
  },
  timeoutSeconds: 30,
  memoryMB: 256,
});