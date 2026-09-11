from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from app.models.indic_bert.main import assess_text, assess_batch

router = APIRouter(prefix="/api/text", tags=["IndicBERT Text Assessment"])

class TextAssessRequest(BaseModel):
    text: str = Field(..., description="Transcribed or typed grievance text in Hindi or Hinglish")
    threshold: Optional[float] = Field(0.40, ge=0.0, le=1.0, description="Detection threshold for operational emotions")

class BatchTextAssessRequest(BaseModel):
    texts: List[str] = Field(..., description="List of grievance texts to assess in batch")
    threshold: Optional[float] = Field(0.40, ge=0.0, le=1.0)

class TextAssessResponse(BaseModel):
    status: str = "success"
    text: str
    detected_emotions: List[str]
    emotion_scores: Dict[str, float]
    distress_score: float
    is_critical: bool
    urgency_level: str

@router.post("/assess", response_model=TextAssessResponse)
async def assess_endpoint(req: TextAssessRequest):
    try:
        result = assess_text(req.text, threshold=req.threshold)
        return {
            "status": "success",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assess_batch")
async def assess_batch_endpoint(req: BatchTextAssessRequest):
    try:
        results = assess_batch(req.texts, threshold=req.threshold)
        return {
            "status": "success",
            "count": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
