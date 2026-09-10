import io
import os
import av
import torch
import numpy as np
import soundfile as sf
import torchaudio

def convert_to_wav_tensor(audio_input, target_sr: int = 16000) -> torch.Tensor:
    """
    Universally decodes ANY audio format (.webm, .opus, .mp3, .m4a, .ogg, .wav, .flac)
    and converts it into a standardized 16kHz mono PyTorch tensor of shape [1, samples].
    
    Parameters:
        audio_input: str (file path), bytes (raw upload), or io.BytesIO buffer.
        target_sr: Target sample rate (default: 16000 Hz expected by IndicConformer).
        
    Returns:
        torch.Tensor of shape [1, num_samples] with dtype=torch.float32.
    """
    # 1. Prepare buffer if raw bytes provided
    if isinstance(audio_input, bytes):
        audio_source = io.BytesIO(audio_input)
    else:
        audio_source = audio_input

    # 2. Try decoding with PyAV (handles webm, opus, mp3, m4a, wav, etc.)
    try:
        container = av.open(audio_source)
        resampler = av.AudioResampler(format="flt", layout="mono", rate=target_sr)
        
        frames = []
        for frame in container.decode(audio=0):
            resampled_frames = resampler.resample(frame)
            for rf in resampled_frames:
                frames.append(rf.to_ndarray())
                
        if frames:
            audio_array = np.concatenate(frames, axis=1) # Shape: [1, samples]
            return torch.tensor(audio_array, dtype=torch.float32)
    except Exception as e:
        # Fallback to soundfile / torchaudio for standard WAV / FLAC files
        pass

    # 3. Fallback loader using soundfile
    data, sr = sf.read(audio_source)
    wav = torch.tensor(data, dtype=torch.float32)
    
    if wav.ndim == 1:
        wav = wav.unsqueeze(0)
    else:
        # If stereo or multichannel, average channels down to mono
        wav = torch.mean(wav, dim=1, keepdim=True).t()
        
    if sr != target_sr:
        resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=target_sr)
        wav = resampler(wav)
        
    return wav

def convert_and_save_wav(audio_input, output_wav_path: str, target_sr: int = 16000) -> str:
    """
    Converts any audio format to a physical 16kHz mono .wav file on disk.
    """
    wav_tensor = convert_to_wav_tensor(audio_input, target_sr=target_sr)
    audio_data = wav_tensor.squeeze(0).cpu().numpy()
    sf.write(output_wav_path, audio_data, target_sr)
    return output_wav_path
