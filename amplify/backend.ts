import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sensorSimulator } from './functions/sensorSimulator/resource';
import { actuatorControl } from './functions/actuatorControl/resource';
import { chatResponder } from './functions/chatResponder/resource';

const backend = defineBackend({
  auth,
  data,
  sensorSimulator,
  actuatorControl,
  chatResponder,
});

// Grant the sensor simulator Lambda write access to the SensorReading table
const sensorReadingTable = backend.data.resources.tables['SensorReading'];
backend.sensorSimulator.addEnvironment(
  'SENSOR_READING_TABLE_NAME',
  sensorReadingTable.tableName
);
sensorReadingTable.grantWriteData(backend.sensorSimulator.resources.lambda);

const actuatorCommandTable = backend.data.resources.tables['ActuatorCommand'];
backend.actuatorControl.addEnvironment(
  'ACTUATOR_TABLE',
  actuatorCommandTable.tableName
);

actuatorCommandTable.grantReadWriteData(backend.actuatorControl.resources.lambda);

backend.chatResponder.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'bedrock:InvokeModel',
      'bedrock:InvokeModelWithResponseStream',
      'bedrock:Converse',
      'bedrock:ConverseStream',
    ],
    resources: ['*'],
  }),
);
