import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.models.asr import transcribe_audio

app = FastAPI(title="Saathi ASR Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

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