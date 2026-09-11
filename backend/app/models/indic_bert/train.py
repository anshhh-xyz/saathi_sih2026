import os
import sys
import json
import argparse
import numpy as np
import torch
from sklearn.metrics import f1_score, precision_recall_fscore_support, accuracy_score
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding
)
from datasets import load_from_disk

HF_TOKEN = None

def get_compute_metrics_fn(label_list):
    def compute_metrics(eval_pred, threshold: float = 0.5):
        logits, labels = eval_pred
        probs = 1 / (1 + np.exp(-logits))
        preds = (probs >= threshold).astype(np.float32)

        macro_f1 = f1_score(labels, preds, average="macro", zero_division=0)
        micro_f1 = f1_score(labels, preds, average="micro", zero_division=0)
        exact_match = accuracy_score(labels, preds)

        metrics = {
            "macro_f1": float(macro_f1),
            "micro_f1": float(micro_f1),
            "exact_match": float(exact_match)
        }

        precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average=None, zero_division=0)
        for i, name in enumerate(label_list):
            metrics[f"f1_{name}"] = float(f1[i])

        return metrics
    return compute_metrics

def train_model(
    data_dir: str,
    output_dir: str,
    epochs: int = 4,
    batch_size: int = 16,
    lr: float = 3e-5,
    hf_token: str = None
):
    print("=" * 75)
    print("   SAATHI - IndicBERT Model Fine-Tuning Pipeline (train.py)")
    print(f"   Preprocessed Data Dir : {data_dir}")
    print(f"   Model Output Dir      : {output_dir}")
    print("=" * 75)

    label_map_path = os.path.join(data_dir, "label_map.json")
    if not os.path.exists(label_map_path):
        raise FileNotFoundError(f"label_map.json not found in {data_dir}. Run prepare.py first!")

    with open(label_map_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    label_list = meta["labels"]
    id2label = {int(k): v for k, v in meta["id2label"].items()}
    label2id = meta["label2id"]
    base_model_name = meta.get("base_model", "ai4bharat/IndicBERT-v3-270M")
    num_labels = len(label_list)

    dataset_dict = load_from_disk(data_dir)
    train_dataset = dataset_dict["train"]
    val_dataset = dataset_dict["validation"]

    resolved_token = hf_token or HF_TOKEN or os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")
    if resolved_token:
        from huggingface_hub import login
        login(token=resolved_token)

    tokenizer = AutoTokenizer.from_pretrained(
        data_dir if os.path.exists(os.path.join(data_dir, "tokenizer_config.json")) else base_model_name,
        token=resolved_token,
        trust_remote_code=True
    )

    model = AutoModelForSequenceClassification.from_pretrained(
        base_model_name,
        num_labels=num_labels,
        problem_type="multi_label_classification",
        id2label=id2label,
        label2id=label2id,
        token=resolved_token,
        torch_dtype=torch.float32,
        trust_remote_code=True
    )

    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

    use_cuda = torch.cuda.is_available()

    steps_per_epoch = max(1, len(train_dataset) // batch_size)
    warmup_steps = int(0.1 * steps_per_epoch * epochs)

    training_args = TrainingArguments(
        output_dir=os.path.join(output_dir, "checkpoints"),
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=lr,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size * 2,
        num_train_epochs=epochs,
        weight_decay=0.01,
        warmup_steps=warmup_steps,
        fp16=False,
        logging_steps=25,
        load_best_model_at_end=True,
        metric_for_best_model="macro_f1",
        greater_is_better=True,
        save_total_limit=1,
        report_to="none"
    )

    import inspect
    trainer_kwargs = {
        "model": model,
        "args": training_args,
        "train_dataset": train_dataset,
        "eval_dataset": val_dataset,
        "data_collator": data_collator,
        "compute_metrics": get_compute_metrics_fn(label_list)
    }

    trainer_params = inspect.signature(Trainer.__init__).parameters
    if "processing_class" in trainer_params:
        trainer_kwargs["processing_class"] = tokenizer
    elif "tokenizer" in trainer_params:
        trainer_kwargs["tokenizer"] = tokenizer

    trainer = Trainer(**trainer_kwargs)

    trainer.train()

    eval_metrics = trainer.evaluate()
    print("\n" + "=" * 50)
    print("   FINAL VALIDATION RESULTS")
    print("=" * 50)
    print(f"Macro-F1 Score : {eval_metrics.get('eval_macro_f1', 0.0):.4f}")
    print(f"Micro-F1 Score : {eval_metrics.get('eval_micro_f1', 0.0):.4f}")
    print(f"Exact Match    : {eval_metrics.get('eval_exact_match', 0.0):.4f}")

    os.makedirs(output_dir, exist_ok=True)
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)

    with open(os.path.join(output_dir, "label_map.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

if __name__ == "__main__":
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
    except NameError:
        current_dir = os.getcwd()

    default_data = os.path.join(current_dir, "processed_data")
    if not os.path.exists(default_data) and os.path.exists("/kaggle/input"):
        import glob
        matches = glob.glob("/kaggle/input/**/label_map.json", recursive=True)
        if matches:
            default_data = os.path.dirname(matches[0])
        elif os.path.exists("/kaggle/working/processed_data"):
            default_data = "/kaggle/working/processed_data"
    elif not os.path.exists(default_data) and os.path.exists("/kaggle/working/processed_data"):
        default_data = "/kaggle/working/processed_data"

    default_out = os.path.join(current_dir, "saved_model")
    if os.path.exists("/kaggle"):
        default_out = "/kaggle/working/saved_model"

    parser = argparse.ArgumentParser(description="Fine-tune IndicBERT on preprocessed dataset")
    parser.add_argument("--data_dir", type=str, default=default_data, help="Path to processed_data directory from prepare.py")
    parser.add_argument("--output_dir", type=str, default=default_out, help="Directory to save final model weights")
    parser.add_argument("--epochs", type=int, default=4, help="Number of training epochs (default: 4)")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size per device (default: 16)")
    parser.add_argument("--lr", type=float, default=3e-5, help="Learning rate (default: 3e-5)")
    parser.add_argument("--hf_token", type=str, default=None, help="Hugging Face token if required")

    args, _ = parser.parse_known_args()

    train_model(
        data_dir=args.data_dir,
        output_dir=args.output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        hf_token=args.hf_token
    )
