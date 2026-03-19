import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Gaussian-like jitter: sum of multiple randoms for a more natural distribution
function jitter(range: number): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) * range;
}

function round(val: number, decimals = 2): number {
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}

export const handler = async (): Promise<void> => {
  const tableName = process.env.SENSOR_READING_TABLE_NAME;
  if (!tableName) throw new Error('SENSOR_READING_TABLE_NAME env var not set');

  const now = new Date().toISOString();

  const reading = {
    id: randomUUID(),
    greenhouseId: 'mars-greenhouse-1',
    timestamp: now,
    // Martian greenhouse targets with realistic fluctuation
    temperature:  round(22   + jitter(2.5)),   // °C  — target 22, ±~2.5
    humidity:     round(65   + jitter(5)),      // %   — target 65, ±~5
    co2Ppm:       Math.round(1200 + jitter(80)), // ppm — target 1200, ±~80
    lightPpfd:    round(400  + jitter(30)),     // µmol/m²/s — LED grow lights
    phLevel:      round(6.2  + jitter(0.3)),    // pH  — hydroponic target 6.2
    nutrientEc:   round(2.1  + jitter(0.2)),    // mS/cm — nutrient solution EC
    waterLitres:  round(150  + jitter(10)),     // L   — reservoir level
    radiationMsv: round(0.07 + jitter(0.01), 3),
    createdAt: now,
    updatedAt: now,
    __typename: 'SensorReading',
  };

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: reading,
    })
  );

  console.log('SensorReading written:', JSON.stringify(reading));
};
