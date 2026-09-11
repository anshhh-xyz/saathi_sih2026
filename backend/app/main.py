import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.models.asr import transcribe_audio
from app.api.indic_bert import router as indic_bert_router

app = FastAPI(
    title="SAATHI AI Multimodal Triage API",
    description="Real-Time Stress, Emotion & Atrocity Triage Layer for NHAA (14566), MoSJE",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(indic_bert_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SAATHI AI Triage Layer",
        "modules": {
            "asr": "ai4bharat/indic-conformer-600m-multilingual",
            "indic_bert": "ai4bharat/IndicBERT-v3-270M (Fine-Tuned on PoA Dataset)"
        }
    }

@app.post("/api/asr/transcribe")
async def transcribe_endpoint(file: UploadFile = File(...), lang: str = "hi"):
    audio_bytes = await file.read()
    text = transcribe_audio(audio_bytes, lang=lang, decoder="ctc")

    return {
        "status": "success",
        "transcription": text,
        "filename": file.filename,
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)