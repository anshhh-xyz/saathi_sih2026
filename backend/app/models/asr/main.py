import torch
import torchaudio
import soundfile as sf
from transformers import AutoModel

# 1. Load model
model = AutoModel.from_pretrained("ai4bharat/indic-conformer-600m-multilingual", trust_remote_code=True)


def transcribe_audio(audio_path: str, lang: str = "hi") -> str:
    data, sr = sf.read(audio_path)
    wav = torch.tensor(data, dtype=torch.float32).unsqueeze(0)
    if sr != 16000:
        wav = torchaudio.transforms.Resample(orig_freq=sr, new_freq=16000)(wav)
    
    with torch.no_grad():
        # Use "ctc" for fast real-time response, or "rnnt" for high accuracy
        return model(wav, lang, "ctc")

