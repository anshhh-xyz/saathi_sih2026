import os
import sys
import json
import random
import re
import argparse
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from transformers import AutoTokenizer
from datasets import Dataset, DatasetDict, load_from_disk

DEFAULT_MODEL_NAME = "ai4bharat/IndicBERT-v3-270M"

LABEL_LIST = [
    "fear",
    "intimidation",
    "panic",
    "hopelessness",
    "anger",
    "sadness",
    "immediate_danger",
    "help_seeking",
    "others"
]

NUM_LABELS = len(LABEL_LIST)
LABEL2ID = {label: i for i, label in enumerate(LABEL_LIST)}
ID2LABEL = {i: label for i, label in enumerate(LABEL_LIST)}

HINDI_FILLERS = [
    "अरे बाबूजी... ",
    "अरे सर... ",
    "मतलब... ",
    "सुनिए... ",
    "बाबूजी... ",
    "हम क्या बताएं... ",
    "सर प्लीज... "
]

HINGLISH_FILLERS = [
    "Arre sir... ",
    "Matlab... ",
    "Sir suniye... ",
    "Please help... ",
    "Arre babuji... ",
    "Hum kya karein... "
]

REPETITION_PATTERNS = [
    (r"\bडर\b", "डर... डर"),
    (r"\bबहुत\b", "बहुत बहुत"),
    (r"\bबचाओ\b", "बचाओ... बचाओ"),
    (r"\bमार\b", "मार-मार"),
    (r"\bभाग\b", "भाग-भाग"),
    (r"\bdarr\b", "darr... darr"),
    (r"\bbohot\b", "bohot bohot"),
    (r"\bbachao\b", "bachao bachao"),
    (r"\bmaar\b", "maar maar"),
    (r"\bhelp\b", "help please help")
]

def apply_speech_noise(text: str, language: str = "hi") -> str:
    augmented = text.strip()

    if random.random() < 0.5:
        for pattern, replacement in REPETITION_PATTERNS:
            if re.search(pattern, augmented, flags=re.IGNORECASE):
                augmented = re.sub(pattern, replacement, augmented, count=1, flags=re.IGNORECASE)
                break

    if random.random() < 0.4:
        if language == "hinglish":
            filler = random.choice(HINGLISH_FILLERS)
        else:
            filler = random.choice(HINDI_FILLERS)
        augmented = filler + augmented

    if random.random() < 0.35:
        augmented = re.sub(r'[,।\.\?!;:\'"]', ' ', augmented)
        augmented = re.sub(r'\s+', ' ', augmented).strip()

    return augmented

def emotions_to_multihot(emotions_str: str) -> list:
    vector = [0.0] * NUM_LABELS
    if not isinstance(emotions_str, str):
        vector[LABEL2ID["others"]] = 1.0
        return vector

    tags = [t.strip().lower() for t in emotions_str.split(",")]
    matched = False
    for tag in tags:
        if tag in LABEL2ID:
            vector[LABEL2ID[tag]] = 1.0
            matched = True
    if not matched:
        vector[LABEL2ID["others"]] = 1.0
    return vector

def calculate_derived_metrics(emotions_str: str):
    if not isinstance(emotions_str, str):
        return 10.0, 0

    tags = [t.strip().lower() for t in emotions_str.split(",")]
    is_critical = 1 if "immediate_danger" in tags else 0

    weights = {
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

    raw_score = sum(weights.get(t, 0.0) for t in tags)
    distress_score = min(100.0, max(5.0, raw_score + 10.0))
    if "others" in tags and len(tags) == 1:
        distress_score = 10.0

    return distress_score, is_critical

def prepare_dataset(
    csv_path: str,
    output_dir: str,
    model_name: str = DEFAULT_MODEL_NAME,
    max_length: int = 128,
    test_size: float = 0.15,
    augment_speech: bool = True,
    augment_ratio: float = 0.25,
    random_seed: int = 42,
    hf_token: str = None
):
    print("=" * 75)
    print("   SAATHI - Dataset Preprocessing & Speech Augmentation (prepare.py)")
    print(f"   Input CSV             : {csv_path}")
    print(f"   Output Dir            : {output_dir}")
    print(f"   Tokenizer             : {model_name}")
    print(f"   Speech Augmentation   : {augment_speech} (ratio: {augment_ratio*100:.0f}%)")
    print(f"   Labels ({NUM_LABELS})          : {LABEL_LIST}")
    print("=" * 75)

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Error: CSV file not found at {csv_path}")

    if hf_token:
        from huggingface_hub import login
        login(token=hf_token)

    df = pd.read_csv(csv_path)

    df = df.dropna(subset=["transcription"])
    df["transcription"] = df["transcription"].astype(str).str.strip()
    df = df[df["transcription"].str.len() > 5]

    derived = [calculate_derived_metrics(e) for e in df["emotions"]]
    df["distress_score"] = [d[0] for d in derived]
    df["is_critical"] = [d[1] for d in derived]

    df["labels"] = df["emotions"].apply(emotions_to_multihot)

    train_df, val_df = train_test_split(df, test_size=test_size, random_state=random_seed)
    train_df = train_df.copy()
    val_df = val_df.copy()

    if augment_speech:
        augmented_rows = []
        num_to_augment = int(len(train_df) * augment_ratio)
        sample_subset = train_df.sample(n=num_to_augment, random_state=random_seed)

        for _, row in sample_subset.iterrows():
            noisy_text = apply_speech_noise(row["transcription"], language=str(row.get("language", "hi")))
            if noisy_text != row["transcription"]:
                augmented_rows.append({
                    "transcription": noisy_text,
                    "language": row.get("language", "hi"),
                    "emotions": row["emotions"],
                    "labels": row["labels"],
                    "distress_score": row["distress_score"],
                    "is_critical": row["is_critical"]
                })

        if augmented_rows:
            aug_df = pd.DataFrame(augmented_rows)
            train_df = pd.concat([train_df, aug_df], ignore_index=True)

    train_dataset = Dataset.from_pandas(train_df[["transcription", "labels"]].rename(columns={"transcription": "text"}).reset_index(drop=True))
    val_dataset = Dataset.from_pandas(val_df[["transcription", "labels"]].rename(columns={"transcription": "text"}).reset_index(drop=True))

    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)

    def tokenize_fn(batch):
        return tokenizer(
            batch["text"],
            padding=False,
            truncation=True,
            max_length=max_length
        )

    tokenized_train = train_dataset.map(tokenize_fn, batched=True)
    tokenized_val = val_dataset.map(tokenize_fn, batched=True)

    dataset_dict = DatasetDict({
        "train": tokenized_train,
        "validation": tokenized_val
    })

    os.makedirs(output_dir, exist_ok=True)
    dataset_dict.save_to_disk(output_dir)

    label_map_file = os.path.join(output_dir, "label_map.json")
    with open(label_map_file, "w", encoding="utf-8") as f:
        json.dump({
            "labels": LABEL_LIST,
            "id2label": ID2LABEL,
            "label2id": LABEL2ID,
            "base_model": model_name,
            "max_length": max_length,
            "train_samples": len(train_df),
            "val_samples": len(val_df),
            "speech_augmented": augment_speech,
            "augmented_samples_added": len(augmented_rows) if augment_speech else 0
        }, f, indent=2)

    tokenizer.save_pretrained(output_dir)

    print(f"Data Preparation Complete: {output_dir}")

if __name__ == "__main__":
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
    except NameError:
        current_dir = os.getcwd()

    default_csv = os.path.join(current_dir, "grievance_dataset.csv")
    if not os.path.exists(default_csv) and os.path.exists("/kaggle/input"):
        import glob
        matches = (
            glob.glob("/kaggle/input/**/grievance_dataset*.csv", recursive=True) or
            glob.glob("/kaggle/input/**/*.csv", recursive=True)
        )
        if matches:
            default_csv = matches[0]

    default_out = os.path.join(current_dir, "processed_data")

    parser = argparse.ArgumentParser(description="Preprocess, augment, and tokenize grievance dataset for IndicBERT")
    parser.add_argument("--csv", type=str, default=default_csv, help="Path to input grievance_dataset.csv")
    parser.add_argument("--output_dir", type=str, default=default_out, help="Directory to save processed dataset")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL_NAME, help="Hugging Face model/tokenizer name")
    parser.add_argument("--max_length", type=int, default=128, help="Max token sequence length")
    parser.add_argument("--test_size", type=float, default=0.15, help="Validation set split fraction (default: 0.15)")
    parser.add_argument("--no_augment", action="store_true", help="Disable speech/ASR noise augmentation")
    parser.add_argument("--augment_ratio", type=float, default=0.25, help="Ratio of train samples to augment (default: 0.25)")
    parser.add_argument("--hf_token", type=str, default=None, help="Hugging Face API token if model is gated")

    args, _ = parser.parse_known_args()

    prepare_dataset(
        csv_path=args.csv,
        output_dir=args.output_dir,
        model_name=args.model,
        max_length=args.max_length,
        test_size=args.test_size,
        augment_speech=not args.no_augment,
        augment_ratio=args.augment_ratio,
        hf_token=args.hf_token
    )
