export type BaseStatus = 'nominal' | 'warning' | 'critical';
export type ZoneStatus = 'healthy' | 'warning' | 'critical' | 'quarantined';
export type ZoneType = 'growing' | 'nutrient' | 'storage' | 'quarantine' | 'airlock';
export type GrowthStage = 'seedling' | 'vegetative' | 'harvest-ready';
export type CloneRole = 'harvester' | 'inspector' | 'technician';
export type AgentId = 'environment' | 'crop' | 'astro' | 'resource' | 'orchestrator';

export interface SimulationParams {
  temperature: number;
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

export interface TechnologyDevice {
  name: string;
  category: string;
  status: 'online' | 'standby' | 'maintenance';
  power: string;
  componentHealth: string;
  failureRisk: string;
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
  type: 'info' | 'warning' | 'critical' | 'success';
}

export type ChatMessageRole = 'user' | 'system' | 'agent';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  author: string;
  message: string;
  agent?: AgentId | 'system' | 'user';
  toolCalls?: AgentToolCall[];
}

export interface AgentInteraction {
  id: string;
  agent: AgentId;
  message: string;
  status: 'queued' | 'active' | 'complete';
  timestamp: number;
}

export interface AgentToolCall {
  id: string;
  type: string;
  label: string;
  summary: string;
  agent: AgentId;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ToolCallTile extends AgentToolCall {
  status: 'active' | 'complete';
  timestamp: number;
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

export interface DiseaseInspectionAssessment {
  disease: string;
  riskLevel: 'low' | 'medium' | 'high';
  explanation: string;
}
