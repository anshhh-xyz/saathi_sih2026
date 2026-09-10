import torch
import torchaudio
import soundfile as sf
from transformers import AutoModel

model = AutoModel.from_pretrained("ai4bharat/indic-conformer-600m-multilingual", trust_remote_code=True)

data, sr = sf.read("test-audio.wav")
wav = torch.tensor(data, dtype=torch.float32).unsqueeze(0)
if sr != 16000:
    wav = torchaudio.transforms.Resample(orig_freq=sr, new_freq=16000)(wav)

print("CTC Transcription:", model(wav, "hi", "ctc"))
print("RNNT Transcription:", model(wav, "hi", "rnnt"))
