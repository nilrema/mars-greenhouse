import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const ACTUATOR_TABLE = process.env.ACTUATOR_TABLE || 'ActuatorCommand';

interface ActuatorCommand {
  commandId: string;
  type: 'TEMPERATURE_ADJUST' | 'HUMIDITY_ADJUST' | 'IRRIGATION_TRIGGER' | 'LIGHTING_ADJUST' | 'CO2_ADJUST';
  targetValue?: number;
  zone: string;
  unit?: string;
  durationSeconds?: number;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  executedAt?: string;
  result?: string;
}

export const handler = async (event: any) => {
  console.log('Actuator control function invoked:', JSON.stringify(event, null, 2));

  try {
    // Check if this is a scheduled execution or direct invocation
    if (event.source === 'aws.events') {
      // Scheduled execution - process pending commands
      return await processPendingCommands();
    } else if (event.commandId) {
      // Direct command execution
      return await executeCommand(event);
    } else {
      // New command submission
      return await createCommand(event);
    }
  } catch (error) {
    console.error('Error in actuator control:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function createCommand(command: Partial<ActuatorCommand>) {
  const commandId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const fullCommand: ActuatorCommand = {
    commandId,
    type: command.type!,
    targetValue: command.targetValue,
    zone: command.zone || 'main',
    unit: command.unit,
    durationSeconds: command.durationSeconds,
    status: 'PENDING',
    createdAt: now,
    executedAt: undefined,
    result: undefined,
  };

  await ddb.send(new PutItemCommand({
    TableName: ACTUATOR_TABLE,
    Item: marshall(fullCommand),
  }));

  console.log(`Command created: ${commandId} - ${command.type} for zone ${command.zone}`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Command queued for execution',
      commandId,
      status: 'PENDING',
    }),
  };
}

async function executeCommand(command: ActuatorCommand) {
  console.log(`Executing command: ${command.commandId} - ${command.type}`);

  // Update command status to EXECUTING
  await ddb.send(new PutItemCommand({
    TableName: ACTUATOR_TABLE,
    Item: marshall({
      ...command,
      status: 'EXECUTING',
      executedAt: new Date().toISOString(),
    }),
  }));

  try {
    // Simulate actuator execution (in real system, this would control actual hardware)
    let result = '';
    
    switch (command.type) {
      case 'TEMPERATURE_ADJUST':
        result = `Temperature adjusted to ${command.targetValue}°C in zone ${command.zone}`;
        console.log(result);
        break;
        
      case 'HUMIDITY_ADJUST':
        result = `Humidity adjusted to ${command.targetValue}% in zone ${command.zone}`;
        console.log(result);
        break;
        
      case 'IRRIGATION_TRIGGER':
        result = `Irrigation triggered for ${command.durationSeconds} seconds in zone ${command.zone}`;
        console.log(result);
        break;
        
      case 'LIGHTING_ADJUST':
        result = `Lighting adjusted to ${command.targetValue} PPFD in zone ${command.zone}`;
        console.log(result);
        break;
        
      case 'CO2_ADJUST':
        result = `CO2 adjusted to ${command.targetValue} ppm in zone ${command.zone}`;
        console.log(result);
        break;
        
      default:
        result = `Unknown command type: ${command.type}`;
        console.warn(result);
    }

    // Update command status to COMPLETED
    await ddb.send(new PutItemCommand({
      TableName: ACTUATOR_TABLE,
      Item: marshall({
        ...command,
        status: 'COMPLETED',
        result,
      }),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Command executed successfully',
        commandId: command.commandId,
        status: 'COMPLETED',
        result,
      }),
    };
  } catch (error) {
    console.error(`Command execution failed: ${command.commandId}`, error);
    
    // Update command status to FAILED
    await ddb.send(new PutItemCommand({
      TableName: ACTUATOR_TABLE,
      Item: marshall({
        ...command,
        status: 'FAILED',
        result: `Execution failed: ${error}`,
      }),
    }));

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Command execution failed',
        commandId: command.commandId,
        status: 'FAILED',
      }),
    };
  }
}

async function processPendingCommands() {
  console.log('Processing pending actuator commands...');

  // In a real system, this would query DynamoDB for PENDING commands
  // For this demo, we'll simulate finding and processing commands
  
  const simulatedCommands: ActuatorCommand[] = [
    {
      commandId: 'sim-1',
      type: 'TEMPERATURE_ADJUST',
      targetValue: 22.5,
      zone: 'main',
      unit: 'celsius',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    },
    {
      commandId: 'sim-2',
      type: 'IRRIGATION_TRIGGER',
      zone: 'zone-a',
      durationSeconds: 300,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    },
  ];

  const results = [];
  
  for (const command of simulatedCommands) {
    try {
      const result = await executeCommand(command);
      results.push({
        commandId: command.commandId,
        success: true,
        result: JSON.parse(result.body),
      });
    } catch (error) {
      results.push({
        commandId: command.commandId,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Pending commands processed',
      processed: results.length,
      results,
    }),
  };
}

// Helper function to get command status
export async function getCommandStatus(commandId: string) {
  const response = await ddb.send(new GetItemCommand({
    TableName: ACTUATOR_TABLE,
    Key: marshall({ commandId }),
  }));

  if (!response.Item) {
    return null;
  }

  return unmarshall(response.Item);
}