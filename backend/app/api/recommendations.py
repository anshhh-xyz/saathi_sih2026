from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.core.recommendation_generator import generate_case_recommendations

router = APIRouter(prefix="/api/recommendations", tags=["Assistance & Recommendations"])

class RecommendationItem(BaseModel):
    id: str
    title: str
    title_hi: Optional[str] = None
    badge: Optional[str] = None
    description: str
    action_label: str
    action_url: str
    type: Optional[str] = "welfare"

class RecommendationRequest(BaseModel):
    description: str = Field(..., description="Complainant narrative description")
    category: Optional[str] = Field("threats_intimidation")
    location: Optional[str] = Field(None)
    active_threat: Optional[bool] = Field(False)
    dynamic_answers: Optional[List[Dict[str, Any]]] = Field(None)

class RecommendationResponse(BaseModel):
    status: str = "success"
    source: str
    nhaa_message: str
    recommendations: List[RecommendationItem]

@router.post("/generate", response_model=RecommendationResponse)
async def generate_recommendations_endpoint(req: RecommendationRequest):
    res = generate_case_recommendations(
        description=req.description,
        category=req.category or "threats_intimidation",
        location=req.location,
        active_threat=req.active_threat or False,
        dynamic_answers=req.dynamic_answers
    )
    return res
