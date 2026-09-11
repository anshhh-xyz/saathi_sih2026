import os
import re
import json
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification

class IndicBERTClassifier:
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

    def __init__(self, model_dir: str = None, device: str = None):
        if model_dir is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_dir = os.path.join(current_dir, "saved_model")

        self.model_dir = model_dir
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        label_map_path = os.path.join(model_dir, "label_map.json")
        if not os.path.exists(label_map_path):
            raise FileNotFoundError(f"label_map.json not found in {model_dir}")

        with open(label_map_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        self.labels = self.metadata["labels"]
        self.id2label = {int(k): v for k, v in self.metadata["id2label"].items()}
        self.label2id = self.metadata["label2id"]
        self.max_length = self.metadata.get("max_length", 128)

        self.tokenizer = AutoTokenizer.from_pretrained(model_dir, trust_remote_code=True)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_dir,
            dtype=torch.float32,
            trust_remote_code=True
        )

        self.model.to(self.device)
        self.model.eval()

    def predict(self, text: str, threshold: float = 0.40) -> dict:
        if not text or not text.strip():
            return {
                "text": text,
                "detected_emotions": ["others"],
                "emotion_scores": {l: 0.0 for l in self.labels},
                "distress_score": 10.0,
                "is_critical": False,
                "urgency_level": "LOW"
            }

        inputs = self.tokenizer(
            text.strip(),
            max_length=self.max_length,
            truncation=True,
            padding=True,
            return_tensors="pt"
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits.squeeze(0).cpu().numpy()

        probs = 1.0 / (1.0 + np.exp(-logits))

        emotion_scores = {}
        detected = []
        for i, label in enumerate(self.labels):
            score = float(probs[i])
            emotion_scores[label] = round(score, 4)
            if score >= threshold:
                detected.append(label)

        has_danger = bool(re.search(
            r"(hamla|हमला|attack|maar\s*rahe|मार\s*रहे|peet\s*rahe|पीट\s*रहे|tod\s*rahe|तोड़\s*रहे|तोड़\s*रहे|ghus\s*gaye|घुस\s*गए|jaan\s*se|जान\s*से|hathiyar|हथियार|bandook|बंदूक|talwar|तलवार|chaku|चाकू|aag\s*laga|आग\s*लगा|lathi|लाठी|goli|गोली)",
            text,
            re.IGNORECASE
        ))
        has_rescue = bool(re.search(
            r"(bachao|बचाओ|bachaiye|बचाइए|help|save\s*us|madad|मदद|police\s*bhejo|पुलिस\s*भेजो)",
            text,
            re.IGNORECASE
        ))

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
            detected.append(self.labels[top_idx])

        raw_score = sum(
            self.DISTRESS_WEIGHTS.get(label, 0.0) * emotion_scores[label]
            for label in self.labels
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
