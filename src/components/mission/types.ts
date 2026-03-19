export type BaseStatus = 'nominal' | 'warning' | 'critical';
export type ZoneStatus = 'healthy' | 'warning' | 'critical' | 'quarantined';
export type ZoneType = 'growing' | 'nutrient' | 'storage' | 'quarantine' | 'airlock';
export type GrowthStage = 'seedling' | 'vegetative' | 'harvest-ready';
export type CloneRole = 'harvester' | 'inspector' | 'technician';
export type AgentId = 'environment' | 'crop' | 'astro' | 'resource' | 'orchestrator';
export type ChatSeverity = 'info' | 'warning' | 'critical' | 'success';
export type ScenarioId =
  | 'nominal-day'
  | 'water-pressure'
  | 'disease-suspicion'
  | 'dust-storm'
  | 'harvest-rush';
export type ModuleSignalStatus = 'nominal' | 'watch' | 'alert';

export interface SimulationParams {
  temperatureDrift: number;
  waterRecycling: number;
  powerAvailability: number;
}

export interface HardwareState {
  heaterActive: boolean;
  heaterPower: number;
  irrigationPumpFlow: number;
  ledBrightness: number;
}

export interface CropData {
  name: string;
  growthStage: number;
  daysToHarvest: number;
  health: number;
  stressStatus: string;
  projectedYield: number;
  anomaly: boolean;
}

export interface EnvironmentData {
  temperature: number;
  humidity: number;
  co2: number;
  light: number;
  water: number;
}

export interface MarsBase {
  id: string;
  name: string;
  label: string;
  status: BaseStatus;
  production: number;
  risk: number;
  crops: CropData[];
  environment: EnvironmentData;
  hardware: HardwareState;
}

export interface AstronautRecord {
  name: string;
  avatar: string;
  role: string;
  calories: { current: number; target: number };
  protein: { current: number; target: number };
  micronutrientScore: number;
  hydration: 'optimal' | 'adequate' | 'low';
  health: BaseStatus;
}

export interface AgentStatusCard {
  id: AgentId;
  name: string;
  role: string;
  icon: string;
  status: BaseStatus;
  currentAction: string;
}

export interface ActivityFeedItem {
  agent: AgentId;
  message: string;
  timestamp: number;
  type: ChatSeverity;
}

export interface ConversationMessage {
  id: string;
  source: 'system' | 'agent' | 'user';
  message: string;
  timestamp: number;
  type: ChatSeverity;
  agent?: AgentId;
  agentName?: string;
  agentRole?: string;
  pending?: boolean;
  failed?: boolean;
}

export interface HumanMetrics {
  nutritionScore: number;
  mealDiversity: number;
  foodSecurityDays: number;
  crewHealthRisk: BaseStatus;
}

export interface GreenhouseZone {
  id: string;
  name: string;
  type: ZoneType;
  crop?: string;
  growthStage?: GrowthStage;
  predictedYield?: number;
  humidity: number;
  temperature: number;
  nutrientStatus?: string;
  waterUptake?: number;
  co2: number;
  diseaseRisk: number;
  inspectionConfidence: number;
  status: ZoneStatus;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AstronautClone {
  id: string;
  name: string;
  role: CloneRole;
  status: 'idle' | 'walking' | 'harvesting' | 'returning';
  assignedZone: string | null;
  x: number;
  y: number;
}

export interface AgentRecommendation {
  agent: string;
  icon: string;
  message: string;
}

export interface NormalizedInspectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface CameraViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface InspectionSelection {
  cameraId: string;
  createdAt: string;
  normalizedBounds: NormalizedInspectionBounds;
  viewport: CameraViewportState;
}

export type Agent = AgentStatusCard;
export type ReasoningLog = ActivityFeedItem;

export interface ModuleSummary extends MarsBase {
  location: string;
  alert: string;
  harvestScore: number;
  resourcePressure: number;
  astroImpact: number;
  evidence: string[];
  dispatchQueue: string[];
  statusLabel: ModuleSignalStatus;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  label: string;
  summary: string;
  leadAgent: AgentId;
  affectedModules: string[];
}

export interface SpecialistSnapshot {
  agentId: AgentId;
  name: string;
  role: string;
  icon: string;
  status: ModuleSignalStatus;
  headline: string;
  riskScore: number;
  recommendations: string[];
  affectedModules: string[];
  timestamp: number;
}

export interface OrchestratorDecision {
  leadAgent: AgentId;
  priorityStack: Array<{
    owner: AgentId;
    reason: string;
  }>;
  operatorSummary: string;
  nextActions: string[];
  scenarioLabel: string;
}

export interface CommandCenterMetrics {
  harvestReadiness: number;
  resourcePressure: number;
  astronautLoad: number;
  incidentState: 'Nominal' | 'Watch' | 'Active';
}
