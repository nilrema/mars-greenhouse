import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sensorSimulator } from './functions/sensorSimulator/resource';
import { actuatorControl } from './functions/actuatorControl/resource';

const backend = defineBackend({
  auth,
  data,
  sensorSimulator,
  actuatorControl,
});

// Grant the sensor simulator Lambda write access to the SensorReading table
const sensorReadingTable = backend.data.resources.tables['SensorReading'];
backend.sensorSimulator.resources.lambda.addEnvironment(
  'SENSOR_READING_TABLE_NAME',
  sensorReadingTable.tableName
);
sensorReadingTable.grantWriteData(backend.sensorSimulator.resources.lambda);

// Create ActuatorCommand table and grant permissions to actuator control Lambda
const actuatorCommandTable = backend.data.resources.cfnResources.dynamoDbTables['ActuatorCommand'] = 
  backend.data.stack.addDynamoDBTable('ActuatorCommand', {
    partitionKey: {
      name: 'commandId',
      type: 'S',
    },
    timeToLiveAttribute: 'ttl',
  });

backend.actuatorControl.resources.lambda.addEnvironment(
  'ACTUATOR_TABLE',
  actuatorCommandTable.tableName
);

// Grant read/write permissions to actuator control Lambda
actuatorCommandTable.grantReadWriteData(backend.actuatorControl.resources.lambda);

// Also grant read access to the orchestrator agent (via IAM role that would be attached)
// In a real deployment, this would be a separate IAM role for the ECS task
