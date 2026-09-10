import torch
import torchaudio
import soundfile as sf
from transformers import AutoModel

# 1. Load model
model = AutoModel.from_pretrained("ai4bharat/indic-conformer-600m-multilingual", trust_remote_code=True)

# 2. Load audio (Mac compatible)
data, sr = sf.read("test-audio.wav")
wav = torch.tensor(data, dtype=torch.float32).unsqueeze(0)
if sr != 16000:
    wav = torchaudio.transforms.Resample(orig_freq=sr, new_freq=16000)(wav)

# 3. Transcribe
print("CTC Transcription:", model(wav, "hi", "ctc"))
print("RNNT Transcription:", model(wav, "hi", "rnnt"))
