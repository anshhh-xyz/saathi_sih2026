import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models.indic_bert.classifier import IndicBERTClassifier

def main():
    print("=" * 80)
    print("       SAATHI - IndicBERT Distress & Emotion Assessment Test Suite")
    print("=" * 80)

    model_path = os.path.join(backend_dir, "app", "models", "indic_bert", "saved_model")
    print(f"Loading fine-tuned model from: {model_path} ...")
    classifier = IndicBERTClassifier(model_dir=model_path)
    print("Model & Tokenizer loaded successfully on device:", classifier.device)
    print("=" * 80)

    test_cases = [
        {
            "category": "Immediate Violence & Attack (Hinglish)",
            "text": "Sir please bachao hume! Hamare tola par 15-20 log lathi dande lekar attack kar rahe hain aur ghar tod rahe hain, jaan se maar denge hume!"
        },
        {
            "category": "Police Inaction & FIR Refusal (Hinglish)",
            "text": "Thanedhar sahab hamari FIR register nahi kar rahe hain. Bol rahe hain compromise kar lo varna ulta false case me andar kar denge. Ye open casteism hai!"
        },
        {
            "category": "Social Boycott & Well Water Denial (Hinglish)",
            "text": "Gaon ki panchayat ne hamara poora samajik bahishkar kar diya hai. Kuan se paani nahi lene de rahe, koi baat nahi karta, hum jeene ki umeed kho chuke hain."
        },
        {
            "category": "Women Harassment & Intimidation (Hinglish)",
            "text": "Sir dabang log roz raaste me school jaate waqt ladkiyon ko gaaliyan dete hain aur chhedte hain. Hum darr ke maare ladkiyon ko bahar nahi bhej pa rahe."
        },
        {
            "category": "Patta Land Encroachment & Crop Damage (Hinglish)",
            "text": "Hamari legal patta zameen par gaon ke dabang ne tractor chala kar poori fasal barbaad kar di aur jaati soochak gaali dekar jaan se maarne ki dhamki di."
        },
        {
            "category": "Administrative Inquiry / Compensation Query (Hinglish)",
            "text": "Hello sir, mujhe SC ST atrocity relief fund ke online process aur compensation scheme ke guidelines ke baare me jankari chahiye thi please."
        }
    ]

    print("\nEvaluating Benchmark Caller Grievances:\n")

    for idx, case in enumerate(test_cases, 1):
        text = case["text"]
        category = case["category"]
        res = classifier.predict(text)

        print(f"[{idx}] Category       : {category}")
        print(f"    Caller Speech  : \"{text}\"")
        print(f"    Urgency Level  : {res['urgency_level']} {'[PRIORITY DISPATCH]' if res['is_critical'] else ''}")
        print(f"    Distress Score : {res['distress_score']:.1f} / 100.0")
        print(f"    Detected Tags  : {', '.join(res['detected_emotions'])}")
        print("    Class Probabilities:")

        sorted_scores = sorted(res["emotion_scores"].items(), key=lambda x: x[1], reverse=True)
        score_strs = []
        for name, score in sorted_scores:
            indicator = "★" if score >= 0.40 else " "
            score_strs.append(f"{indicator} {name}: {score:.3f}")

        col1 = score_strs[0:3]
        col2 = score_strs[3:6]
        col3 = score_strs[6:9]
        for c1, c2, c3 in zip(col1, col2, col3):
            print(f"       {c1:<25} {c2:<25} {c3:<25}")
        print("-" * 80)

    print("\nAll test scenarios evaluated successfully!")

if __name__ == "__main__":
    main()
