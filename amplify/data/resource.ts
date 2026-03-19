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
      pressureKpa: a.float(),
      oxygenPercent: a.float(),
      rootZoneOxygenPct: a.float(),
      recycleRatePercent: a.float(),
      powerKw: a.float(),
      cropStressIndex: a.float(),
      foodSecurityDays: a.float(),
      sol: a.integer(),
      activeEvent: a.enum([
        'NONE',
        'DUST_STORM',
        'CO2_SCRUBBER_FAULT',
        'WATER_PUMP_FAILURE',
        'HEATER_MALFUNCTION',
      ]),
      controlMode: a.enum(['AUTO', 'MANUAL', 'SAFE_MODE']),
      targetProfile: a.json(),
      notes: a.string(),
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
      cropType: a.enum(['LEAFY_GREEN', 'ROOT_TUBER', 'LEGUME', 'FRUITING_CROP', 'HERB']),
      missionRole: a.enum(['MICRONUTRIENT', 'ENERGY_BACKBONE', 'PROTEIN_SECURITY', 'MORALE']),
      growthCycleDays: a.integer(),
      harvestIndex: a.float(),
      targetTempMinC: a.float(),
      targetTempMaxC: a.float(),
      targetHumidityMinPct: a.float(),
      targetHumidityMaxPct: a.float(),
      targetCo2MinPpm: a.integer(),
      targetCo2MaxPpm: a.integer(),
      targetPpfdMin: a.float(),
      targetPpfdMax: a.float(),
      targetPhMin: a.float(),
      targetPhMax: a.float(),
      targetEcMin: a.float(),
      targetEcMax: a.float(),
      caloriesPer100g: a.float(),
      proteinPer100g: a.float(),
      expectedYieldKgM2: a.float(),
      waterDemandLevel: a.enum(['LOW', 'MODERATE', 'HIGH']),
      stressSensitivity: a.json(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  AstronautProfile: a
    .model({
      astronautId: a.string().required(),
      name: a.string().required(),
      role: a.enum(['COMMANDER', 'ENGINEER', 'BIOLOGIST', 'MEDICAL_OFFICER']),
      bodyMassKg: a.float(),
      activityLevel: a.enum(['LOW', 'MODERATE', 'HIGH']),
      dailyCalorieTarget: a.integer(),
      dailyProteinTargetG: a.float(),
      dailyHydrationTargetL: a.float(),
      dailyKcalIntake: a.integer(),
      dailyProteinIntakeG: a.float(),
      dailyHydrationIntakeL: a.float(),
      micronutrientRisk: a.enum(['LOW', 'MEDIUM', 'HIGH']),
      fatigueScore: a.integer(),
      workloadIndex: a.integer(),
      healthStatus: a.enum(['NOMINAL', 'WATCH', 'ALERT']),
      preferences: a.json(),
      notes: a.string(),
      lastAssessmentAt: a.datetime(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  AgentEvent: a
    .model({
      agentId: a.string().required(),
      timestamp: a.datetime().required(),
      severity: a.enum(['INFO', 'WARN', 'CRITICAL']),
      message: a.string(),
      actionTaken: a.string(),
      greenhouseId: a.string(),
      confidence: a.float(),
      linkedCommandId: a.string(),
      evidence: a.json(),
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
      confidence: a.float(),
      nutritionalCoverageScore: a.float(),
      kpiSnapshot: a.json(),
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
      confidence: a.float(),
      evidence: a.json(),
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
      expectedDurationHours: a.integer(),
      mitigationPlaybook: a.json(),
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
      priority: a.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      dueBy: a.datetime(),
      context: a.json(),
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
      requestedBy: a.string(),
      rationale: a.string(),
      confidence: a.float(),
      safetyCheckPassed: a.boolean(),
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
