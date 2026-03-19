from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

AgentId = Literal["environment", "crop", "astro", "resource", "orchestrator"]
RiskLevel = Literal["nominal", "warning", "critical"]


class RouteDecision(BaseModel):
    selected_agents: list[AgentId] = Field(min_length=1)
    rationale: str
    dispatch_message: str


class SpecialistAssessment(BaseModel):
    risk_level: RiskLevel
    summary: str
    key_evidence: list[str] = Field(default_factory=list)
    requested_support: list[str] = Field(default_factory=list)
    proposed_actions: list[str] = Field(default_factory=list)
    current_action: str
    response_message: str


class SpecialistFollowUp(BaseModel):
    alignment_message: str
    updated_action: str
    blockers: list[str] = Field(default_factory=list)


class ResolutionStep(BaseModel):
    owner: AgentId
    action: str
    reason: str


class OrchestratorResolution(BaseModel):
    lead_agent: AgentId
    summary: str
    course_of_action: list[ResolutionStep] = Field(min_length=1)
    success_condition: str


class RuntimeContext(BaseModel):
    user_message: str
    conversation_id: str
    request_id: str
    simulation_context: dict
    simulation_summary: str
    selected_agents: list[AgentId] = Field(default_factory=list)
