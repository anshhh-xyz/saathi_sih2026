import torch
from transformers import AutoModel

try:
    from .conversion import convert_to_wav_tensor
except ImportError:
    from conversion import convert_to_wav_tensor

model = AutoModel.from_pretrained("ai4bharat/indic-conformer-600m-multilingual", trust_remote_code=True)
model.eval()

def transcribe_audio(audio_input, lang: str = "hi", decoder: str = "ctc") -> str:
    wav = convert_to_wav_tensor(audio_input, target_sr=16000)
    with torch.no_grad():
        return model(wav, lang, decoder)
