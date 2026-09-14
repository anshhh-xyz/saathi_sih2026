from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.core.priority import calculate_priority

router = APIRouter(prefix="/api/priority", tags=["Priority Triage Engine"])

class PriorityCalculateRequest(BaseModel):
    text_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    text_confidence: Optional[str] = Field("High")
    acoustic_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    acoustic_confidence: Optional[str] = Field(None)
    checkin_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    checkin_confidence: Optional[str] = Field("High")
    category: Optional[str] = Field("other")
    recency_days: Optional[float] = Field(0.0, ge=0.0)
    is_ongoing_risk: Optional[bool] = Field(False)
    vulnerable_group: Optional[bool] = Field(False)
    safety_flag_active: Optional[bool] = Field(False)
    safety_flag_type: Optional[str] = Field(None)
    safety_flag_detail: Optional[str] = Field(None)
    detected_emotions: Optional[List[str]] = Field(None)

class ModalityBreakdown(BaseModel):
    available: bool
    nominal_weight: float
    effective_weight: float
    score: Optional[float]
    contribution: float

class SafetyFlagModel(BaseModel):
    active: bool
    type: str
    detail: str

class PriorityCalculateResponse(BaseModel):
    status: str = "success"
    priority_score: int
    priority_level: str
    overall_confidence: str
    critical_override: bool
    safety_flag: SafetyFlagModel
    breakdown: Dict[str, ModalityBreakdown]
    suggested_action: str
    copilot_suggestions: List[str]

@router.post("/calculate", response_model=PriorityCalculateResponse)
async def calculate_priority_endpoint(req: PriorityCalculateRequest):
    try:
        result = calculate_priority(
            text_score=req.text_score,
            text_confidence=req.text_confidence or "High",
            acoustic_score=req.acoustic_score,
            acoustic_confidence=req.acoustic_confidence,
            checkin_score=req.checkin_score,
            checkin_confidence=req.checkin_confidence or "High",
            category=req.category or "other",
            recency_days=req.recency_days or 0.0,
            is_ongoing_risk=req.is_ongoing_risk or False,
            vulnerable_group=req.vulnerable_group or False,
            safety_flag_active=req.safety_flag_active or False,
            safety_flag_type=req.safety_flag_type,
            safety_flag_detail=req.safety_flag_detail,
            detected_emotions=req.detected_emotions
        )
        return {
            "status": "success",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
