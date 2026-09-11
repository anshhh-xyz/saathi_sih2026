import os
import re
import json
import torch
import numpy as np
from typing import List, Dict, Any
from transformers import AutoTokenizer, AutoModelForSequenceClassification

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "saved_model")
LABEL_MAP_PATH = os.path.join(MODEL_DIR, "label_map.json")

DEVICE = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")

DISTRESS_WEIGHTS = {
    "immediate_danger": 40.0,
    "panic": 25.0,
    "fear": 20.0,
    "intimidation": 20.0,
    "hopelessness": 15.0,
    "anger": 15.0,
    "sadness": 10.0,
    "help_seeking": 10.0,
    "others": 0.0
}

DANGER_REGEX = re.compile(
    r"(hamla|हमला|attack|maar\s*rahe|मार\s*रहे|peet\s*rahe|पीट\s*रहे|tod\s*rahe|तोड़\s*रहे|तोड़\s*रहे|ghus\s*gaye|घुस\s*गए|jaan\s*se|जान\s*से|hathiyar|हथियार|bandook|बंदूक|talwar|तलवार|chaku|चाकू|aag\s*laga|आग\s*लगा|lathi|लाठी|goli|गोली)",
    re.IGNORECASE
)

RESCUE_REGEX = re.compile(
    r"(bachao|बचाओ|bachaiye|बचाइए|help|save\s*us|madad|मदद|police\s*bhejo|पुलिस\s*भेजो)",
    re.IGNORECASE
)

with open(LABEL_MAP_PATH, "r", encoding="utf-8") as f:
    _metadata = json.load(f)

LABELS = _metadata["labels"]
ID2LABEL = {int(k): v for k, v in _metadata["id2label"].items()}
LABEL2ID = _metadata["label2id"]
MAX_LENGTH = _metadata.get("max_length", 128)

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, trust_remote_code=True)
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_DIR,
    dtype=torch.float32,
    trust_remote_code=True
)
model.to(DEVICE)
model.eval()

def assess_text(text: str, threshold: float = 0.40) -> Dict[str, Any]:
    if not text or not text.strip():
        return {
            "text": text,
            "detected_emotions": ["others"],
            "emotion_scores": {label: 0.0 for label in LABELS},
            "distress_score": 10.0,
            "is_critical": False,
            "urgency_level": "LOW"
        }

    inputs = tokenizer(
        text.strip(),
        max_length=MAX_LENGTH,
        truncation=True,
        padding=True,
        return_tensors="pt"
    )
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits.squeeze(0).cpu().numpy()

    probs = 1.0 / (1.0 + np.exp(-logits))

    emotion_scores = {}
    detected = []
    for i, label in enumerate(LABELS):
        score = float(probs[i])
        emotion_scores[label] = round(score, 4)
        if score >= threshold:
            detected.append(label)

    has_danger = bool(DANGER_REGEX.search(text))
    has_rescue = bool(RESCUE_REGEX.search(text))

    if has_danger and (has_rescue or emotion_scores.get("fear", 0.0) >= 0.40 or emotion_scores.get("panic", 0.0) >= 0.40):
        emotion_scores["immediate_danger"] = max(emotion_scores.get("immediate_danger", 0.0), 0.88)
        if "immediate_danger" not in detected:
            detected.append("immediate_danger")

    if has_rescue and emotion_scores.get("help_seeking", 0.0) < 0.50:
        emotion_scores["help_seeking"] = max(emotion_scores.get("help_seeking", 0.0), 0.75)
        if "help_seeking" not in detected:
            detected.append("help_seeking")

    if not detected:
        top_idx = int(np.argmax(probs))
        detected.append(LABELS[top_idx])

    raw_score = sum(
        DISTRESS_WEIGHTS.get(label, 0.0) * emotion_scores[label]
        for label in LABELS
    )
    distress_score = round(min(100.0, max(5.0, raw_score + 10.0)), 1)

    is_critical = (
        emotion_scores.get("immediate_danger", 0.0) >= 0.40 or
        (emotion_scores.get("panic", 0.0) >= 0.50 and emotion_scores.get("fear", 0.0) >= 0.70) or
        (emotion_scores.get("fear", 0.0) >= 0.85 and emotion_scores.get("panic", 0.0) >= 0.40) or
        distress_score >= 75.0
    )

    if is_critical:
        urgency_level = "CRITICAL"
    elif distress_score >= 60.0 or emotion_scores.get("fear", 0.0) >= 0.80 or emotion_scores.get("intimidation", 0.0) >= 0.85:
        urgency_level = "HIGH"
    elif distress_score >= 35.0:
        urgency_level = "MEDIUM"
    else:
        urgency_level = "LOW"

    return {
        "text": text,
        "detected_emotions": detected,
        "emotion_scores": emotion_scores,
        "distress_score": distress_score,
        "is_critical": is_critical,
        "urgency_level": urgency_level
    }

def assess_batch(texts: List[str], threshold: float = 0.40) -> List[Dict[str, Any]]:
    if not texts:
        return []

    cleaned_texts = [t.strip() if t and t.strip() else "" for t in texts]

    inputs = tokenizer(
        cleaned_texts,
        max_length=MAX_LENGTH,
        truncation=True,
        padding=True,
        return_tensors="pt"
    )
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits.cpu().numpy()

    probs = 1.0 / (1.0 + np.exp(-logits))
    results = []

    for row_idx, text in enumerate(texts):
        if not text or not text.strip():
            results.append({
                "text": text,
                "detected_emotions": ["others"],
                "emotion_scores": {label: 0.0 for label in LABELS},
                "distress_score": 10.0,
                "is_critical": False,
                "urgency_level": "LOW"
            })
            continue

        row_probs = probs[row_idx]
        emotion_scores = {}
        detected = []
        for i, label in enumerate(LABELS):
            score = float(row_probs[i])
            emotion_scores[label] = round(score, 4)
            if score >= threshold:
                detected.append(label)

        has_danger = bool(DANGER_REGEX.search(text))
        has_rescue = bool(RESCUE_REGEX.search(text))

        if has_danger and (has_rescue or emotion_scores.get("fear", 0.0) >= 0.40 or emotion_scores.get("panic", 0.0) >= 0.40):
            emotion_scores["immediate_danger"] = max(emotion_scores.get("immediate_danger", 0.0), 0.88)
            if "immediate_danger" not in detected:
                detected.append("immediate_danger")

        if has_rescue and emotion_scores.get("help_seeking", 0.0) < 0.50:
            emotion_scores["help_seeking"] = max(emotion_scores.get("help_seeking", 0.0), 0.75)
            if "help_seeking" not in detected:
                detected.append("help_seeking")

        if not detected:
            top_idx = int(np.argmax(row_probs))
            detected.append(LABELS[top_idx])

        raw_score = sum(
            DISTRESS_WEIGHTS.get(label, 0.0) * emotion_scores[label]
            for label in LABELS
        )
        distress_score = round(min(100.0, max(5.0, raw_score + 10.0)), 1)

        is_critical = (
            emotion_scores.get("immediate_danger", 0.0) >= 0.40 or
            (emotion_scores.get("panic", 0.0) >= 0.50 and emotion_scores.get("fear", 0.0) >= 0.70) or
            (emotion_scores.get("fear", 0.0) >= 0.85 and emotion_scores.get("panic", 0.0) >= 0.40) or
            distress_score >= 75.0
        )

        if is_critical:
            urgency_level = "CRITICAL"
        elif distress_score >= 60.0 or emotion_scores.get("fear", 0.0) >= 0.80 or emotion_scores.get("intimidation", 0.0) >= 0.85:
            urgency_level = "HIGH"
        elif distress_score >= 35.0:
            urgency_level = "MEDIUM"
        else:
            urgency_level = "LOW"

        results.append({
            "text": text,
            "detected_emotions": detected,
            "emotion_scores": emotion_scores,
            "distress_score": distress_score,
            "is_critical": is_critical,
            "urgency_level": urgency_level
        })

    return results

