import os
import json
import re
import random
from typing import Dict, Any, List, Optional
import httpx

GROQ_MODEL = "groq/compound-mini"

CATEGORY_FALLBACKS = {
    "threats_intimidation": [
        {
            "id": "q_threat_proximity",
            "dimension": "Perpetrator Proximity & Threat Recurrence",
            "prompt": "Are the persons who threatened you living in the immediate vicinity or still attempting contact?",
            "prompt_hi": "क्या आपको धमकाने वाले लोग आपके आसपास ही रहते हैं या अभी भी संपर्क करने की कोशिश कर रहे हैं?",
            "options": [
                {"label": "No current contact / Safe distance", "label_hi": "अभी कोई संपर्क नहीं / सुरक्षित दूरी", "value": "none", "weight": 0},
                {"label": "Frequent passes / Indirect warnings", "label_hi": "आसपास घूमते हैं / परोक्ष धमकियां", "value": "moderate", "weight": 1},
                {"label": "Armed / Outside home right now", "label_hi": "हथियारबंद / अभी घर के बाहर मौजूद", "value": "severe", "weight": 3, "flag_safety": True}
            ]
        },
        {
            "id": "q_family_vulnerability",
            "dimension": "Family & Household Safety",
            "prompt": "Are women, children, or elderly family members in your household feeling terrified to leave home?",
            "prompt_hi": "क्या आपके परिवार की महिलाएं, बच्चे या बुजुर्ग घर से बाहर निकलने में अत्यधिक डर महसूस कर रहे हैं?",
            "options": [
                {"label": "Able to move freely", "label_hi": "सामान्य आवागमन संभव है", "value": "none", "weight": 0},
                {"label": "Anxious / Moving only accompanied", "label_hi": "चिंता में हैं / साथ में ही निकलते हैं", "value": "moderate", "weight": 1},
                {"label": "Completely confined inside home", "label_hi": "पूरी तरह घर में कैद / बाहर निकलना नामुमकिन", "value": "severe", "weight": 3}
            ]
        },
        {
            "id": "q_police_complaint",
            "dimension": "Police Protection & Legal Accessibility",
            "prompt": "Have you been able to safely approach the local police station to report this intimidation?",
            "prompt_hi": "क्या आप इस धमकी की रिपोर्ट दर्ज कराने के लिए स्थानीय थाने तक सुरक्षित पहुंच पाए हैं?",
            "options": [
                {"label": "Report lodged without hindrance", "label_hi": "बिना बाधा रिपोर्ट दर्ज कराई", "value": "none", "weight": 0},
                {"label": "Threatened not to visit police station", "label_hi": "थाने न जाने की धमकी मिली", "value": "moderate", "weight": 2},
                {"label": "Police refused FIR or pressured compromise", "label_hi": "पुलिस ने एफआईआर नहीं लिखी / समझौते का दबाव", "value": "severe", "weight": 3}
            ]
        }
    ],
    "physical_violence": [
        {
            "id": "q_medical_attention",
            "dimension": "Physical Injury & Emergency Medical Care",
            "prompt": "Have the injured persons received urgent medical examination and treatment (MLC)?",
            "prompt_hi": "क्या घायल व्यक्तियों को तत्काल चिकित्सकीय जांच और उपचार (एमएलसी) मिल चुका है?",
            "options": [
                {"label": "Minor harm / Medical care completed", "label_hi": "हल्की चोट / उपचार हो चुका है", "value": "none", "weight": 0},
                {"label": "Injuries present / Seeking medical care", "label_hi": "चोटें हैं / अस्पताल जाने की तैयारी", "value": "moderate", "weight": 2},
                {"label": "Severe trauma / Urgent hospitalization required", "label_hi": "गंभीर चोटें / तुरंत अस्पताल में भर्ती की जरूरत", "value": "severe", "weight": 3, "flag_safety": True}
            ]
        },
        {
            "id": "q_ongoing_assault",
            "dimension": "Ongoing Attack & Mobilization",
            "prompt": "Is there an active mob or group gathered near your settlement posing continued danger?",
            "prompt_hi": "क्या आपके टोले या बस्ती के पास अभी भी भीड़ जमा है जिससे लगातार खतरा बना हुआ है?",
            "options": [
                {"label": "Attackers dispersed", "label_hi": "हमलावर चले गए हैं", "value": "none", "weight": 0},
                {"label": "Tension persists / Aggressors nearby", "label_hi": "तनाव बना हुआ है / हमलावर आसपास हैं", "value": "moderate", "weight": 1},
                {"label": "Active siege / Urgent police PCR needed", "label_hi": "सक्रिय घेराबंदी / तुरंत पुलिस पीसीआर की आवश्यकता", "value": "severe", "weight": 3, "flag_safety": True}
            ]
        },
        {
            "id": "q_shelter_security",
            "dimension": "Shelter & Property Destruction",
            "prompt": "Has your dwelling or source of livelihood suffered physical destruction or arson?",
            "prompt_hi": "क्या आपके घर, झोपड़ी या आजीविका के साधन को तोड़ा-फोड़ा या आग लगाई गई है?",
            "options": [
                {"label": "No property damage", "label_hi": "कोई संपत्ति नुकसान नहीं", "value": "none", "weight": 0},
                {"label": "Partial property damage", "label_hi": "आंशिक नुकसान हुआ", "value": "moderate", "weight": 1},
                {"label": "Home destroyed / Displaced", "label_hi": "घर नष्ट कर दिया / बेघर हो गए", "value": "severe", "weight": 3}
            ]
        }
    ],
    "caste_abuse": [
        {
            "id": "q_public_humiliation",
            "dimension": "Public Humiliation & Community Impact",
            "prompt": "Did the caste slurs and insult occur in a public view or village square?",
            "prompt_hi": "क्या जातिसूचक अपशब्द और अपमान सार्वजनिक स्थान या चौपाल में लोगों के सामने हुआ?",
            "options": [
                {"label": "Private confrontation", "label_hi": "निजी बातचीत में हुआ", "value": "none", "weight": 0},
                {"label": "Public location with witnesses", "label_hi": "सार्वजनिक स्थल पर गवाहों के सामने", "value": "moderate", "weight": 1},
                {"label": "Severe public humiliation / Recording made", "label_hi": "गंभीर सार्वजनिक अपमान / वीडियो बनाया गया", "value": "severe", "weight": 2}
            ]
        },
        {
            "id": "q_retaliation_fear",
            "dimension": "Fear of Retaliation",
            "prompt": "Are the dominant accused threatening you with ostracization if you report to 14566 or police?",
            "prompt_hi": "क्या दबंग आरोपी शिकायत करने पर सामाजिक या शारीरिक नुकसान की धमकी दे रहे हैं?",
            "options": [
                {"label": "No subsequent threats", "label_hi": "बाद में कोई धमकी नहीं", "value": "none", "weight": 0},
                {"label": "Pressure to compromise", "label_hi": "समझौते का दबाव बना रहे हैं", "value": "moderate", "weight": 1},
                {"label": "Explicit death / eviction threats", "label_hi": "गांव से निकालने या जान से मारने की सीधी धमकी", "value": "severe", "weight": 3, "flag_safety": True}
            ]
        },
        {
            "id": "q_mental_distress",
            "dimension": "Psychological Humiliation & Distress",
            "prompt": "How intensely has this public insult affected your sense of dignity and mental peace?",
            "prompt_hi": "इस अपमान ने आपके आत्मसम्मान और मानसिक शांति को किस हद तक प्रभावित किया है?",
            "options": [
                {"label": "Manageable / Seeking legal justice", "label_hi": "सहनीय / कानूनी न्याय चाहते हैं", "value": "none", "weight": 0},
                {"label": "Deep sadness & humiliation", "label_hi": "गहरा दुःख और अपमान महसूस हो रहा है", "value": "moderate", "weight": 1},
                {"label": "Extreme despair / Hopelessness", "label_hi": "अत्यधिक निराशा / जीने की उम्मीद टूट रही है", "value": "severe", "weight": 3}
            ]
        }
    ],
    "denial_access": [
        {
            "id": "q_resource_nature",
            "dimension": "Denial of Essential Resource",
            "prompt": "Which essential resource or public facility is being denied to your family or community?",
            "prompt_hi": "आपके परिवार या समाज को किस आवश्यक सार्वजनिक सुविधा से रोका जा रहा है?",
            "options": [
                {"label": "Occasional dispute over usage", "label_hi": "उपयोग को लेकर कभी-कभार विवाद", "value": "none", "weight": 0},
                {"label": "Public path / crematorium blocked", "label_hi": "सार्वजनिक रास्ता या श्मशान रोका गया", "value": "moderate", "weight": 2},
                {"label": "Drinking water well / handpump completely blocked", "label_hi": "पीने के पानी का कुआं / हैंडपंप पूरी तरह बंद", "value": "severe", "weight": 3}
            ]
        },
        {
            "id": "q_alternative_source",
            "dimension": "Alternative Access & Livelihood Crisis",
            "prompt": "Do you have any safe alternative access to drinking water or transit without passing the perpetrators?",
            "prompt_hi": "क्या आपके पास हमलावरों के रास्ते से गुजरे बिना पानी या आवागमन का कोई सुरक्षित विकल्प है?",
            "options": [
                {"label": "Alternative available", "label_hi": "अन्य विकल्प उपलब्ध है", "value": "none", "weight": 0},
                {"label": "Requires long detour with difficulty", "label_hi": "कठिनाई से लंबा चक्कर लगाना पड़ता है", "value": "moderate", "weight": 1},
                {"label": "No alternative / Acute daily crisis", "label_hi": "कोई विकल्प नहीं / रोजमर्रा का गंभीर संकट", "value": "severe", "weight": 3}
            ]
        },
        {
            "id": "q_enforcement_inaction",
            "dimension": "Panchayat / Administration Intervention",
            "prompt": "Has the local Panchayat or Block administration taken any action to restore your access?",
            "prompt_hi": "क्या स्थानीय पंचायत या ब्लॉक प्रशासन ने रास्ता/पानी खुलवाने के लिए कोई कदम उठाया है?",
            "options": [
                {"label": "Inquiry initiated", "label_hi": "जांच शुरू हुई है", "value": "none", "weight": 0},
                {"label": "Ignored by authorities", "label_hi": "अधिकारियों ने अनसुना कर दिया", "value": "moderate", "weight": 1},
                {"label": "Authorities siding with dominant group", "label_hi": "अधिकारी दबंगों का पक्ष ले रहे हैं", "value": "severe", "weight": 2}
            ]
        }
    ],
    "economic_boycott": [
        {
            "id": "q_boycott_scope",
            "dimension": "Social & Economic Ostracization",
            "prompt": "Are local village shops, daily wage work, or essential services completely blocked for your community?",
            "prompt_hi": "क्या गांव की दुकानें, मजदूरी या आवश्यक सेवाएं आपके समाज के लिए पूरी तरह बंद कर दी गई हैं?",
            "options": [
                {"label": "Partial friction", "label_hi": "हल्का तनाव", "value": "none", "weight": 0},
                {"label": "Wage work stopped / Shops refuse goods", "label_hi": "मजदूरी रोकी / दुकानों से सामान नहीं दे रहे", "value": "moderate", "weight": 2},
                {"label": "Complete social boycott decree", "label_hi": "पूर्ण सामाजिक बहिष्कार का फरमान", "value": "severe", "weight": 3}
            ]
        },
        {
            "id": "q_starvation_risk",
            "dimension": "Livelihood & Subsistence Threat",
            "prompt": "Is your household facing immediate food shortage or financial ruin due to this boycott?",
            "prompt_hi": "क्या इस बहिष्कार के कारण आपके परिवार को राशन या आजीविका का गंभीर संकट आ गया है?",
            "options": [
                {"label": "Supplies available for now", "label_hi": "फिलहाल कुछ समय का प्रबंध है", "value": "none", "weight": 0},
                {"label": "Under severe financial strain", "label_hi": "गंभीर आर्थिक संकट में हैं", "value": "moderate", "weight": 1},
                {"label": "Acute emergency / Immediate relief needed", "label_hi": "अति संकट / तत्काल राहत व राशन की दरकार", "value": "severe", "weight": 3}
            ]
        },
        {
            "id": "q_retaliation_boycott",
            "dimension": "Coercion to Withdraw Complaint",
            "prompt": "Are village leaders conditioning the end of the boycott on withdrawing your SC/ST complaint?",
            "prompt_hi": "क्या गांव के प्रभावशाली लोग शिकायत वापस लेने की शर्त पर बहिष्कार खत्म करने का दबाव बना रहे हैं?",
            "options": [
                {"label": "No such condition mentioned", "label_hi": "ऐसी कोई शर्त नहीं रखी गई", "value": "none", "weight": 0},
                {"label": "Informal pressure to compromise", "label_hi": "दबाव बनाया जा रहा है", "value": "moderate", "weight": 1},
                {"label": "Strict ultimatum backed by threats", "label_hi": "धमकी भरा सख्त अल्टीमेटम दिया गया है", "value": "severe", "weight": 3, "flag_safety": True}
            ]
        }
    ],
    "land_dispute": [
        {
            "id": "q_land_occupation",
            "dimension": "Physical Occupation & Destruction",
            "prompt": "Is your government-allotted patta land currently physically occupied or crops damaged by force?",
            "prompt_hi": "क्या आपकी पट्टे की जमीन पर दबंगों ने जबरन कब्जा कर लिया है या फसल नष्ट कर दी है?",
            "options": [
                {"label": "Dispute over boundary / Not occupied", "label_hi": "मेड़ का विवाद / कब्जा नहीं हुआ", "value": "none", "weight": 0},
                {"label": "Attempted encroachment / Crops damaged", "label_hi": "कब्जे की कोशिश / फसल बर्बाद की", "value": "moderate", "weight": 2},
                {"label": "Full forceful occupation with machinery", "label_hi": "ट्रैक्टर लगाकर पूरी जमीन पर जबरन कब्जा", "value": "severe", "weight": 3}
            ]
        },
        {
            "id": "q_arms_threat",
            "dimension": "Armed Intimidation at Farmland",
            "prompt": "Were weapons, firearms, or tractors used to threaten your family when you tried to enter your land?",
            "prompt_hi": "जब आप अपने खेत पर गए तो क्या लाठी, हथियार या ट्रैक्टर से आपको जान से मारने की धमकी दी गई?",
            "options": [
                {"label": "Verbal altercation only", "label_hi": "केवल कहासुनी हुई", "value": "none", "weight": 0},
                {"label": "Physical pushing / Threats", "label_hi": "हाथापाई और धमकियां दी गईं", "value": "moderate", "weight": 1},
                {"label": "Armed assault / Severe death threat", "label_hi": "हथियार लहराए / जान से मारने की खुली धमकी", "value": "severe", "weight": 3, "flag_safety": True}
            ]
        },
        {
            "id": "q_revenue_records",
            "dimension": "Revenue / Legal Documentation Status",
            "prompt": "Do you possess legal patta documents, and has the Revenue Tehsildar / Lekhpal verified your title?",
            "prompt_hi": "क्या आपके पास जमीन के वैध पट्टा कागजात हैं, और क्या तहसीलदार/लेखपाल ने नाप की है?",
            "options": [
                {"label": "Valid patta / Records in hand", "label_hi": "वैध पट्टा और कागजात मौजूद हैं", "value": "none", "weight": 0},
                {"label": "Paperwork pending verification", "label_hi": "कागजी कार्रवाई लंबित है", "value": "moderate", "weight": 1},
                {"label": "Lekhpal / Local officials refusing demarcation", "label_hi": "लेखपाल/प्रशासन दबंगों के डर से नाप नहीं कर रहा", "value": "severe", "weight": 2}
            ]
        }
    ]
}

def load_groq_api_keys() -> List[str]:
    keys = []
    env_keys = os.environ.get("GROQ_API_KEYS") or os.environ.get("GROQ_API_KEY")
    if env_keys:
        for k in env_keys.split(","):
            if k.strip():
                keys.append(k.strip())

    if not keys:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
        if os.path.exists(env_file):
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("GROQ_API_KEYS="):
                            raw = line.split("=", 1)[1].strip()
                            for k in raw.split(","):
                                if k.strip():
                                    keys.append(k.strip())
            except Exception:
                pass

    return keys

def extract_json_from_text(raw_text: str) -> Optional[Dict[str, Any]]:
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    try:
        data = json.loads(text)
        if isinstance(data, dict) and "questions" in data and isinstance(data["questions"], list):
            return data
    except Exception:
        pass

    match = re.search(r"\{[\s\S]*\"questions\"[\s\S]*\}", text)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict) and "questions" in data:
                return data
        except Exception:
            pass

    return None

def get_category_fallback(category: str) -> Dict[str, Any]:
    cat_key = str(category or "").strip().lower().replace(" ", "_").replace("-", "_")
    matched_key = "threats_intimidation"
    for k in CATEGORY_FALLBACKS:
        if k in cat_key or cat_key in k:
            matched_key = k
            break

    return {
        "case_summary": f"Categorized under {matched_key.replace('_', ' ').title()} - Atrocity triage protocol",
        "source": "curated_fallback",
        "questions": CATEGORY_FALLBACKS.get(matched_key, CATEGORY_FALLBACKS["threats_intimidation"])
    }

def generate_case_questions(
    description: str,
    category: str = "threats_intimidation",
    location: Optional[str] = None,
    detected_emotions: Optional[List[str]] = None,
    distress_score: Optional[float] = None
) -> Dict[str, Any]:
    if not description or len(description.strip()) < 10:
        return get_category_fallback(category)

    api_keys = load_groq_api_keys()
    if not api_keys:
        return get_category_fallback(category)

    selected_key = random.choice(api_keys)

    emotions_hint = ", ".join(detected_emotions) if detected_emotions else "distress"
    score_hint = f"{round(distress_score)}/100" if distress_score is not None else "elevated"

    prompt = f"""You are an empathetic, professional triage officer for the National Helpline Against Atrocities (14566), Ministry of Social Justice & Empowerment, Government of India.
A citizen from the Scheduled Caste / Scheduled Tribe community has registered this grievance:

- Atrocity Category: {category}
- Location / District: {location or 'Not specified'}
- IndicBERT Distress Level: {score_hint} (Tags: {emotions_hint})
- Incident Narrative: "{description.strip()}"

Generate exactly 3 tailored, non-clinical triage screening questions specific to THIS exact case to assess:
1. Immediate Physical Safety & Threat Proximity (whether perpetrators are armed, nearby, or actively threatening).
2. Institutional, Social, or Economic Obstacles (police FIR denial, water/well denial, land seizure, boycott, compromise pressure).
3. Functional, Emotional, or Family Hardship (sleep disruption, fear leaving home, impact on children/women).

Strict Requirements:
- Questions must reference specifics from the citizen's narrative (e.g. farmland, water well, police refusal, lathi attack, threats).
- Provide both English ('prompt') and authentic Hindi in Devanagari script ('prompt_hi').
- Each question must have exactly 3 options:
    Option 0: Low/No impact (weight: 0)
    Option 1: Moderate/Noticeable impact (weight: 1)
    Option 2: High/Severe impact (weight: 3, include "flag_safety": true ONLY if life-threatening)
- Output valid JSON only without markdown formatting.

Format:
{{
  "case_summary": "1-sentence executive summary of the incident",
  "questions": [
    {{
      "id": "q_1",
      "dimension": "Physical Threat & Proximity",
      "prompt": "...",
      "prompt_hi": "...",
      "options": [
        {{"label": "...", "label_hi": "...", "value": "none", "weight": 0}},
        {{"label": "...", "label_hi": "...", "value": "moderate", "weight": 1}},
        {{"label": "...", "label_hi": "...", "value": "severe", "weight": 3, "flag_safety": true}}
      ]
    }}
  ]
}}"""

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {selected_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are an expert AI triage assistant for the NHAA helpline. Generate precise JSON only."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.4,
        "max_tokens": 1200
    }

    try:
        with httpx.Client(timeout=18.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                raw_content = resp.json()["choices"][0]["message"]["content"]
                parsed = extract_json_from_text(raw_content)
                if parsed and len(parsed.get("questions", [])) >= 3:
                    parsed["source"] = "groq_ai"
                    parsed["status"] = "success"
                    return parsed
    except Exception:
        pass

    return get_category_fallback(category)
