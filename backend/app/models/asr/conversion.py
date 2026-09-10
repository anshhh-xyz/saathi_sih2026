import io
import os
import av
import torch
import numpy as np
import soundfile as sf
import torchaudio

def convert_to_wav_tensor(audio_input, target_sr: int = 16000) -> torch.Tensor:
    if isinstance(audio_input, bytes):
        audio_source = io.BytesIO(audio_input)
    else:
        audio_source = audio_input

    try:
        container = av.open(audio_source)
        resampler = av.AudioResampler(format="flt", layout="mono", rate=target_sr)
        
        frames = []
        for frame in container.decode(audio=0):
            resampled_frames = resampler.resample(frame)
            for rf in resampled_frames:
                frames.append(rf.to_ndarray())
                
        if frames:
            audio_array = np.concatenate(frames, axis=1)
            return torch.tensor(audio_array, dtype=torch.float32)
    except Exception:
        pass

    data, sr = sf.read(audio_source)
    wav = torch.tensor(data, dtype=torch.float32)
    
    if wav.ndim == 1:
        wav = wav.unsqueeze(0)
    else:
        wav = torch.mean(wav, dim=1, keepdim=True).t()
        
    if sr != target_sr:
        resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=target_sr)
        wav = resampler(wav)
        
    return wav

def convert_and_save_wav(audio_input, output_wav_path: str, target_sr: int = 16000) -> str:
    wav_tensor = convert_to_wav_tensor(audio_input, target_sr=target_sr)
    audio_data = wav_tensor.squeeze(0).cpu().numpy()
    sf.write(output_wav_path, audio_data, target_sr)
    return output_wav_path
