from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.core.question_generator import generate_case_questions

router = APIRouter(prefix="/api/questions", tags=["Dynamic Triage Questions"])

class QuestionGenerateRequest(BaseModel):
    description: str = Field(..., description="Complainant incident description")
    category: Optional[str] = Field("threats_intimidation")
    location: Optional[str] = Field(None)
    detected_emotions: Optional[List[str]] = Field(None)
    distress_score: Optional[float] = Field(None)

class QuestionOption(BaseModel):
    label: str
    label_hi: Optional[str] = None
    value: str
    weight: int = 0
    flag_safety: Optional[bool] = False

class GeneratedQuestion(BaseModel):
    id: str
    dimension: Optional[str] = None
    prompt: str
    prompt_hi: Optional[str] = None
    options: List[QuestionOption]

class QuestionGenerateResponse(BaseModel):
    status: str = "success"
    source: str
    case_summary: Optional[str] = None
    questions: List[GeneratedQuestion]

@router.post("/generate", response_model=QuestionGenerateResponse)
async def generate_questions_endpoint(req: QuestionGenerateRequest):
    try:
        res = generate_case_questions(
            description=req.description,
            category=req.category or "threats_intimidation",
            location=req.location,
            detected_emotions=req.detected_emotions,
            distress_score=req.distress_score
        )
        return {
            "status": "success",
            **res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
