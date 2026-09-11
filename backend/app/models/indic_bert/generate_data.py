import os
import sys
import csv
import json
import time
import random
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any

try:
    import httpx
except ImportError:
    print("Error: httpx is not installed. Please run: pip install httpx")
    sys.exit(1)

OUTPUT_CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "grievance_dataset.csv")
TARGET_ROWS = 2000
BATCH_SIZE = 12

GROQ_MODEL = "groq/compound-mini"
GEMINI_MODEL = "gemini-1.5-flash"

GROQ_API_KEYS = []
GEMINI_API_KEYS = []

if not any(GROQ_API_KEYS) and os.environ.get("GROQ_API_KEYS"):
    GROQ_API_KEYS = [k.strip() for k in os.environ.get("GROQ_API_KEYS").split(",") if k.strip()]

if not any(GEMINI_API_KEYS) and os.environ.get("GEMINI_API_KEYS"):
    GEMINI_API_KEYS = [k.strip() for k in os.environ.get("GEMINI_API_KEYS").split(",") if k.strip()]

ALLOWED_EMOTIONS = [
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

LANGUAGE_STYLES = [
    {
        "code": "hi",
        "style": "Eastern Hindi / Purvanchal / Bihari Hindi touch",
        "description": "Uses regional rural phrasing like 'बाबू जी', 'हम गरीब लोगन', 'टोला', 'दबंग', 'हाथापाई', 'रोजी-रोटी', 'थाना-कचहरी'",
        "weight": 22
    },
    {
        "code": "hi",
        "style": "Standard & Administrative Rural Devanagari Hindi",
        "description": "Standard grievance Hindi: 'पट्टे की जमीन', 'अवैध कब्जा', 'जातिसूचक शब्द', 'एफआईआर दर्ज कराने', 'सामाजिक बहिष्कार'",
        "weight": 25
    },
    {
        "code": "hi",
        "style": "Western UP / Haryanvi / Bundelkhandi influenced Hindi",
        "description": "Colloquial dialect tones: 'खेत का रास्ता रोक दियो', 'थानेदार सुनता ही ना', 'सरेआम बेइज्जत कर रहे', 'धमका रहे हैं'",
        "weight": 18
    },
    {
        "code": "hinglish",
        "style": "Colloquial Hinglish (Helpline Webform & WhatsApp style)",
        "description": "Code-mixed: 'Thanedhar complaint nahi le raha', 'Dhamki mil rahi hai case wapas lene ki', 'family bohot scare hai'",
        "weight": 25
    },
    {
        "code": "hi",
        "style": "Tribal / Adivasi belt colloquial Hindi (Central / MP / CG touch)",
        "description": "Expressions concerning: 'जंगल-जमीन का अधिकार', 'सरपंच और वन विभाग के लोग', 'मजदूरी रोकी', 'हमको गाँव से अलग कर दिया'",
        "weight": 10
    }
]

CASE_CATEGORIES = [
    {
        "category": "Threats & Physical Violence",
        "context": "Active assault, beating with lathis, physical intimidation, nocturnal threats, arson threats, women/children terrified.",
        "emotions_hint": "fear,intimidation,anger,panic,immediate_danger"
    },
    {
        "category": "Police Inaction & Institutional Bias",
        "context": "Thanedhar / Daroga refusing to file FIR, tearing complaint paper, forcing victim to compromise with dominant accused, delay in DSP visit.",
        "emotions_hint": "anger,hopelessness,sadness"
    },
    {
        "category": "Discrimination & Public Harassment",
        "context": "Untouchability practice, caste slurs (jaatisuchak gaaliyan), humiliation in panchayat or village square, denied entry into temple/shop.",
        "emotions_hint": "sadness,anger,hopelessness"
    },
    {
        "category": "Land & Property Disputes",
        "context": "Encroachment on ancestral SC/ST patta land, crops burnt or forcefully harvested, agricultural field pathway blocked, tractor stopped.",
        "emotions_hint": "intimidation,anger,hopelessness"
    },
    {
        "category": "Witness & Retaliatory Intimidation",
        "context": "Accused out on bail, roaming freely with weapons, threatening family to take back FIR or face consequences, stalking victim's children.",
        "emotions_hint": "fear,intimidation,help_seeking"
    },
    {
        "category": "Social Exclusion & Boycott",
        "context": "Denied drinking water from public handpump/well, village shops refusing to sell groceries, barber refusing services, total social boycott.",
        "emotions_hint": "hopelessness,sadness,fear"
    },
    {
        "category": "FIR & Procedural Legal Roadblocks",
        "context": "False cross-FIR filed against victim's family, missing medical examination report, lack of legal aid lawyer, compensation pending on portal.",
        "emotions_hint": "hopelessness,anger,others"
    },
    {
        "category": "Immediate Life-Safety Danger",
        "context": "Mob surrounded the basti/house right now, throwing stones, carrying weapons, doors locked from inside, screaming for urgent police rescue.",
        "emotions_hint": "immediate_danger,panic,fear,help_seeking"
    },
    {
        "category": "Non-Urgent & Administrative Grievances",
        "context": "Delayed payment of PoA relief fund, scholarship delay, village road or drainage repair in tola, seeking follow-up on previous docket.",
        "emotions_hint": "others,sadness"
    },
    {
        "category": "Neutral & Non-Distressed Helplines Interactions",
        "context": "Citizen asking 14566 office timings, verifying documents required for legal aid, checking status of registered docket number, calm inquiry.",
        "emotions_hint": "others"
    }
]

csv_lock = threading.Lock()
seen_texts = set()

def get_weighted_style() -> Dict[str, Any]:
    weights = [s["weight"] for s in LANGUAGE_STYLES]
    return random.choices(LANGUAGE_STYLES, weights=weights, k=1)[0]

def read_existing_rows(csv_path: str) -> int:
    if not os.path.exists(csv_path):
        return 0
    count = 0
    try:
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                t = row.get("text", "").strip()
                if t:
                    seen_texts.add(t)
                    count += 1
    except Exception as e:
        print(f"Warning reading existing CSV: {e}")
    return count

def append_rows_to_csv(rows: List[Dict[str, str]], csv_path: str):
    with csv_lock:
        file_exists = os.path.exists(csv_path)
        with open(csv_path, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["text", "language", "emotions"])
            if not file_exists:
                writer.writeheader()
            for r in rows:
                writer.writerow({
                    "text": r["text"],
                    "language": r["language"],
                    "emotions": r["emotions"]
                })

def build_prompt(style: Dict[str, Any], count: int) -> str:
    selected_cats = random.sample(CASE_CATEGORIES, 3)
    cat_bullets = "\n".join([f"- {c['category']}: {c['context']}" for c in selected_cats])
    
    return f"""You are generating training data for the National Helpline Against Atrocities (14566), Ministry of Social Justice & Empowerment, India.
Generate exactly {count} realistic, authentic citizen grievance statements.

Language & Style Requirements:
- Language Code: '{style['code']}'
- Accent / Dialect: {style['style']}
- Linguistic Flavor: {style['description']}
  Use authentic vocabulary naturally spoken by SC/ST community members in Indian villages and towns (e.g. दबंग, पट्टा, टोला, बाबूजी, चौपाल, खलिहान, बेइज्जत, सामाजिक बहिष्कार, एफआईआर, थानेदार, धमकी, दारू पीकर गाली-गलौज, कुआँ/हैंडपंप, गुहार).

Case Scenarios to draw from for these {count} statements:
{cat_bullets}

Emotion Tagging Rules:
- Multi-Label: Assign 1 to 4 applicable emotions per text, comma-separated.
- Allowed emotions ONLY: ["fear", "intimidation", "panic", "hopelessness", "anger", "sadness", "immediate_danger", "help_seeking", "others"].
- NO happy/positive emotions.
- Use "others" exclusively for neutral procedural queries, administrative status checks, or calm inquiries.
- Ensure natural variation: short panicked voice messages (1 sentence) vs detailed narrative complaints (2-3 sentences).

Strictly output a valid JSON array of objects with keys: "text", "language", "emotions". Do not write any markdown preamble.

Example output:
[
  {{
    "text": "बाबू जी, हमारे टोले का रास्ता दबंगों ने ट्रैक्टर लगाकर बंद कर दिया है, निकलने पर जातिसूचक गालियाँ दे रहे हैं।",
    "language": "{style['code']}",
    "emotions": "intimidation,fear"
  }}
]"""

def clean_and_parse_json(raw_text: str) -> List[Dict[str, str]]:
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        lines = raw_text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw_text = "\n".join(lines).strip()

    try:
        parsed = json.loads(raw_text)
    except Exception:
        start = raw_text.find("[")
        end = raw_text.rfind("]")
        if start != -1 and end != -1:
            try:
                parsed = json.loads(raw_text[start:end+1])
            except Exception:
                return []
        else:
            return []

    if isinstance(parsed, dict):
        for k in parsed:
            if isinstance(parsed[k], list):
                parsed = parsed[k]
                break
        if isinstance(parsed, dict):
            parsed = [parsed]

    valid_rows = []
    if isinstance(parsed, list):
        for item in parsed:
            if isinstance(item, dict) and "text" in item and "emotions" in item:
                text = str(item["text"]).strip()
                lang = str(item.get("language", "hi")).strip().lower()
                
                raw_emotions = item["emotions"]
                if isinstance(raw_emotions, list):
                    emo_list = [e.strip().lower() for e in raw_emotions]
                else:
                    emo_list = [e.strip().lower() for e in str(raw_emotions).split(",")]
                
                filtered = [e for e in emo_list if e in ALLOWED_EMOTIONS]
                if not filtered:
                    filtered = ["others"]
                
                emotions_str = ",".join(list(dict.fromkeys(filtered)))
                
                if len(text) > 12:
                    valid_rows.append({
                        "text": text,
                        "language": lang,
                        "emotions": emotions_str
                    })
    return valid_rows

def call_groq(api_key: str, prompt: str) -> List[Dict[str, str]]:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are a professional dataset generator. Output valid JSON array only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.85,
        "max_tokens": 2048
    }
    
    for attempt in range(4):
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"]
                    return clean_and_parse_json(content)
                elif res.status_code == 429:
                    time.sleep(2.5 * (attempt + 1) + random.uniform(0.5, 2.0))
                else:
                    time.sleep(2.0)
        except Exception:
            time.sleep(2.0)
    return []

def call_gemini(api_key: str, prompt: str) -> List[Dict[str, str]]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.85
        }
    }
    
    for attempt in range(4):
        try:
            with httpx.Client(timeout=35.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    return clean_and_parse_json(content)
                elif res.status_code == 429:
                    time.sleep(3.0 * (attempt + 1) + random.uniform(0.5, 2.0))
                else:
                    time.sleep(2.0)
        except Exception:
            time.sleep(2.0)
    return []

def worker_thread(worker_id: str, provider: str, api_key: str, target_total: int, progress_state: Dict[str, Any]):
    while True:
        with csv_lock:
            if progress_state["count"] >= target_total:
                break
                
        style = get_weighted_style()
        prompt = build_prompt(style, count=BATCH_SIZE)
        
        if provider == "groq":
            rows = call_groq(api_key, prompt)
        else:
            rows = call_gemini(api_key, prompt)
            
        if rows:
            new_rows = []
            with csv_lock:
                for r in rows:
                    if progress_state["count"] >= target_total:
                        break
                    if r["text"] not in seen_texts:
                        seen_texts.add(r["text"])
                        new_rows.append(r)
                        progress_state["count"] += 1
                        
            if new_rows:
                append_rows_to_csv(new_rows, OUTPUT_CSV_PATH)
                with csv_lock:
                    total_now = progress_state["count"]
                    pct = (total_now / target_total) * 100
                    print(f"[{time.strftime('%H:%M:%S')}] [{provider.upper()} #{worker_id}] Added {len(new_rows)} rows ({style['code']}) | Progress: {total_now}/{target_total} ({pct:.1f}%)", flush=True)
                    
        time.sleep(1.8)

def main():
    valid_groq = [k for k in GROQ_API_KEYS if k and not k.startswith("gsk_key")]
    valid_gemini = [k for k in GEMINI_API_KEYS if k and not k.startswith("AIzaSy_key")]
    
    total_workers = len(valid_groq) + len(valid_gemini)
    
    if total_workers == 0:
        print("\n❌ No active API keys found!")
        print("Please set environment variables: GROQ_API_KEYS and GEMINI_API_KEYS")
        sys.exit(1)
        
    print(f"Active Workers: {len(valid_groq)} Groq Worker(s) + {len(valid_gemini)} Gemini Worker(s) = {total_workers} Concurrent Streams")
    
    existing_count = read_existing_rows(OUTPUT_CSV_PATH)
    if existing_count > 0:
        print(f"Resuming: Found existing {existing_count} rows in {OUTPUT_CSV_PATH}...")
    else:
        print("Creating new dataset...")
        
    progress_state = {"count": existing_count}
    
    if existing_count >= TARGET_ROWS:
        print(f" Target of {TARGET_ROWS} rows already reached!")
        return

    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=total_workers) as executor:
        futures = []
        
        for idx, key in enumerate(valid_groq):
            futures.append(executor.submit(worker_thread, f"G-{idx+1}", "groq", key, TARGET_ROWS, progress_state))
            
        for idx, key in enumerate(valid_gemini):
            futures.append(executor.submit(worker_thread, f"M-{idx+1}", "gemini", key, TARGET_ROWS, progress_state))
            
        for f in as_completed(futures):
            f.result()
            
    elapsed = time.time() - start_time
    total_added = progress_state["count"] - existing_count
    rate = total_added / max(1, elapsed)
    
    print(f"Total Rows Saved: {progress_state['count']}")
    print(f"New Rows Generated: {total_added} in {elapsed:.1f}s ({rate:.1f} rows/sec)")
    print(f"Saved at: {OUTPUT_CSV_PATH}")

if __name__ == "__main__":
    main()
