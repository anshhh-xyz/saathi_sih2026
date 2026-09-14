import os
import json
import re
import random
from typing import Dict, Any, List, Optional
import httpx
from app.core.question_generator import load_groq_api_keys, GROQ_MODEL

FALLBACK_RECOMMENDATIONS = {
    "threats_intimidation": [
        {
            "id": "rec_legal_aid",
            "title": "Free Legal Representation & FIR Lodging",
            "title_hi": "निःशुल्क कानूनी सहायता एवं एफआईआर दर्ज कराना",
            "badge": "Free Legal Support",
            "description": "Under Section 15A of the SC/ST (PoA) Act, you are entitled to free legal aid and advocate representation from the District Legal Services Authority (DLSA).",
            "action_label": "Call DLSA 15100",
            "action_url": "tel:15100",
            "type": "legal"
        },
        {
            "id": "rec_telemanas",
            "title": "Tele-MANAS Confidential Psychological Counselling",
            "title_hi": "टेली-मानस 24x7 मानसिक स्वास्थ्य परामर्श",
            "badge": "24x7 Mental Health",
            "description": "Free, confidential emotional and crisis support available in Hindi and English around the clock provided by the Ministry of Health.",
            "action_label": "Call Tele-MANAS 14416",
            "action_url": "tel:14416",
            "type": "mental_health"
        },
        {
            "id": "rec_protection",
            "title": "Police Protection & Nodal Officer Escalation",
            "title_hi": "पुलिस सुरक्षा एवं नोडल अधिकारी निगरानी",
            "badge": "Safety Protocol",
            "description": "If perpetrators are in your vicinity or issuing continuous threats, local police are mandated to provide immediate patrol and witness protection.",
            "action_label": "Emergency 112",
            "action_url": "tel:112",
            "type": "emergency"
        },
        {
            "id": "rec_nhaa",
            "title": "NHAA District Officer Case Follow-up",
            "title_hi": "NHAA जिला अधिकारी केस अनुवर्ती सहायता",
            "badge": "Government Tracking",
            "description": "Your docket has been linked to the District Welfare Officer. For real-time updates or to report further developments, speak with the helpline team.",
            "action_label": "Call NHAA 14566",
            "action_url": "tel:14566",
            "type": "welfare"
        }
    ],
    "physical_violence": [
        {
            "id": "rec_protection",
            "title": "Immediate Physical Safety & Police Escort",
            "title_hi": "तत्काल शारीरिक सुरक्षा एवं पुलिस सुरक्षा",
            "badge": "Immediate Safety",
            "description": "Direct link to the local SC/ST Protection Cell and senior superintendent of police for active security and perimeter patrolling.",
            "action_label": "Emergency 112",
            "action_url": "tel:112",
            "type": "emergency"
        },
        {
            "id": "rec_relief_compensation",
            "title": "Immediate Medical Relief & Victim Compensation",
            "title_hi": "तत्काल चिकित्सीय राहत एवं पीड़ित प्रतिकर",
            "badge": "Financial Relief",
            "description": "Under Rule 12(4) of the SC/ST (PoA) Rules, victims of bodily assault are entitled to mandatory interim compensation and free hospital treatment.",
            "action_label": "Call DLSA 15100",
            "action_url": "tel:15100",
            "type": "welfare"
        },
        {
            "id": "rec_telemanas",
            "title": "Trauma Care & Psycho-Social Crisis Support",
            "title_hi": "ट्रॉमा केयर एवं मनोसामाजिक सहायता",
            "badge": "24x7 Mental Health",
            "description": "Dedicated trauma counsellors at Tele-MANAS assist you and affected family members to overcome acute fear and emotional shock.",
            "action_label": "Call Tele-MANAS 14416",
            "action_url": "tel:14416",
            "type": "mental_health"
        },
        {
            "id": "rec_nhaa",
            "title": "NHAA Rapid Response & Verification",
            "title_hi": "NHAA त्वरित कार्रवाई एवं सत्यापन",
            "badge": "Priority Desk",
            "description": "A dedicated welfare officer has been designated to oversee FIR registration, medical examination (MLC), and district nodal action.",
            "action_label": "Call NHAA 14566",
            "action_url": "tel:14566",
            "type": "welfare"
        }
    ],
    "caste_abuse": [
        {
            "id": "rec_legal_aid",
            "title": "DLSA Legal Aid & Atrocity FIR Filing",
            "title_hi": "DLSA विधिक सहायता एवं एफआईआर दर्ज कराना",
            "badge": "Free Legal Aid",
            "description": "Free legal assistance to ensure charges under Sections 3(1)(r) and 3(1)(s) of the SC/ST (PoA) Act are properly invoked and registered.",
            "action_label": "Call DLSA 15100",
            "action_url": "tel:15100",
            "type": "legal"
        },
        {
            "id": "rec_telemanas",
            "title": "Tele-MANAS Dignity & Emotional Support",
            "title_hi": "टेली-मानस भावनात्मक एवं मानसिक संबल",
            "badge": "24x7 Counselling",
            "description": "Trained psychological professionals to provide confidential emotional reassurance following public humiliation and social trauma.",
            "action_label": "Call Tele-MANAS 14416",
            "action_url": "tel:14416",
            "type": "mental_health"
        },
        {
            "id": "rec_nhaa",
            "title": "District Social Welfare Officer Monitoring",
            "title_hi": "जिला समाज कल्याण अधिकारी निगरानी",
            "badge": "Official Action",
            "description": "Your grievance is tracked under the National Helpline system to prevent local compromise pressures and ensure an unbiased enquiry.",
            "action_label": "Call NHAA 14566",
            "action_url": "tel:14566",
            "type": "welfare"
        }
    ],
    "denial_access": [
        {
            "id": "rec_district_enforcement",
            "title": "Sub-Divisional Magistrate (SDM) Resource Restoration",
            "title_hi": "एसडीएम द्वारा सार्वजनिक संसाधन बहाली",
            "badge": "Enforcement Action",
            "description": "Denial of access to community water wells or public roads violates Section 3(1)(za). The Sub-Divisional Magistrate has statutory power to unblock access immediately.",
            "action_label": "Call NHAA 14566",
            "action_url": "tel:14566",
            "type": "welfare"
        },
        {
            "id": "rec_legal_aid",
            "title": "DLSA Legal Assistance & Protection Order",
            "title_hi": "DLSA विधिक सहायता एवं संरक्षण आदेश",
            "badge": "Free Legal Aid",
            "description": "Get assigned a free legal advocate to petition the Special Court for immediate restraining orders against those obstructing access.",
            "action_label": "Call DLSA 15100",
            "action_url": "tel:15100",
            "type": "legal"
        },
        {
            "id": "rec_telemanas",
            "title": "Tele-MANAS Community Family Support",
            "title_hi": "टेली-मानस परिवार कल्याण परामर्श",
            "badge": "24x7 Support",
            "description": "Guidance and counselling to ease distress and anxiety experienced by your household during community blockades.",
            "action_label": "Call Tele-MANAS 14416",
            "action_url": "tel:14416",
            "type": "mental_health"
        }
    ],
    "economic_boycott": [
        {
            "id": "rec_legal_boycott",
            "title": "Anti-Boycott Legal Action (PoA Section 3(1)(zc))",
            "title_hi": "सामाजिक बहिष्कार विरोधी कानूनी कार्रवाई",
            "badge": "Statutory Protection",
            "description": "Social and economic boycott is a non-bailable offense under the PoA Amendment Act. Free DLSA counsels ensure strict penal enforcement.",
            "action_label": "Call DLSA 15100",
            "action_url": "tel:15100",
            "type": "legal"
        },
        {
            "id": "rec_district_relief",
            "title": "District Magistrate Emergency Relief & Rations",
            "title_hi": "जिला प्रशासन द्वारा आवश्यक आपूर्ति एवं सहायता",
            "badge": "Emergency Relief",
            "description": "District administration provides essential provisions, economic protection, and immediate relief to affected families.",
            "action_label": "Call NHAA 14566",
            "action_url": "tel:14566",
            "type": "welfare"
        },
        {
            "id": "rec_telemanas",
            "title": "Tele-MANAS Psychosocial Support",
            "title_hi": "टेली-मानस मानसिक स्वास्थ्य परामर्श",
            "badge": "24x7 Helpline",
            "description": "Confidential support to overcome isolation, stress, and anxiety resulting from social or economic boycott.",
            "action_label": "Call Tele-MANAS 14416",
            "action_url": "tel:14416",
            "type": "mental_health"
        }
    ],
    "land_dispute": [
        {
            "id": "rec_revenue_legal",
            "title": "Demarcation & Revenue Eviction Assistance",
            "title_hi": "राजस्व सीमांकन एवं बेदखली कार्रवाई",
            "badge": "Land Rights",
            "description": "Forced dispossession of SC/ST land is punishable under Section 3(1)(g). District Collectorate enforces immediate demarcation and restoration.",
            "action_label": "Call DLSA 15100",
            "action_url": "tel:15100",
            "type": "legal"
        },
        {
            "id": "rec_protection",
            "title": "Preventive Police Security at Farmland",
            "title_hi": "खेत पर पुलिस गश्त एवं सुरक्षा",
            "badge": "Security Cover",
            "description": "Local police station is instructed to prevent physical confrontations and protect complainant agricultural rights.",
            "action_label": "Emergency 112",
            "action_url": "tel:112",
            "type": "emergency"
        },
        {
            "id": "rec_nhaa",
            "title": "NHAA Land Rights Monitoring Cell",
            "title_hi": "NHAA भूमि अधिकार निगरानी प्रकोष्ठ",
            "badge": "State Monitoring",
            "description": "Monitored case file tracking interaction with the Tehsildar and Sub-Divisional Magistrate to ensure lawful possession.",
            "action_label": "Call NHAA 14566",
            "action_url": "tel:14566",
            "type": "welfare"
        }
    ]
}

def get_fallback_message(category: str, location: Optional[str] = None) -> str:
    loc_str = f" in {location}" if location else ""
    return (
        f"Your grievance has been officially registered and entered into the National Helpline Against Atrocities (14566) database. "
        f"A priority docket has been assigned to the District Atrocity Welfare Cell and local Nodal Officer{loc_str}. "
        f"The administration is actively processing your complaint under the SC/ST (Prevention of Atrocities) Act framework. "
        f"An official will review your case and reach out for verification and necessary field support. "
        f"Please utilize the linked welfare and legal aid services below for immediate assistance."
    )

def get_recommendation_fallback(category: str, location: Optional[str] = None) -> Dict[str, Any]:
    cat_key = str(category or "").strip().lower().replace(" ", "_").replace("-", "_")
    matched_key = "threats_intimidation"
    for k in FALLBACK_RECOMMENDATIONS:
        if k in cat_key or cat_key in k:
            matched_key = k
            break

    recs = FALLBACK_RECOMMENDATIONS.get(matched_key, FALLBACK_RECOMMENDATIONS["threats_intimidation"])
    return {
        "status": "success",
        "source": "curated_fallback",
        "nhaa_message": get_fallback_message(matched_key, location),
        "recommendations": recs
    }

def extract_json_recs(raw_text: str) -> Optional[Dict[str, Any]]:
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
        if isinstance(data, dict) and "recommendations" in data and isinstance(data["recommendations"], list):
            return data
    except Exception:
        pass

    match = re.search(r"\{[\s\S]*\"recommendations\"[\s\S]*\}", text)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict) and "recommendations" in data:
                return data
        except Exception:
            pass

    return None

def generate_case_recommendations(
    description: str,
    category: str = "threats_intimidation",
    location: Optional[str] = None,
    active_threat: bool = False,
    dynamic_answers: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    if not description or len(description.strip()) < 8:
        return get_recommendation_fallback(category, location)

    api_keys = load_groq_api_keys()
    if not api_keys:
        return get_recommendation_fallback(category, location)

    selected_key = random.choice(api_keys)

    answers_str = ""
    if dynamic_answers:
        for a in dynamic_answers:
            dim = a.get("dimension") or "Screening"
            lbl = a.get("selectedLabel") or a.get("label") or ""
            answers_str += f"- {dim}: {lbl}\n"

    prompt = f"""You are the senior compassionate triage director for the National Helpline Against Atrocities (14566), Ministry of Social Justice & Empowerment, Government of India.
A citizen from the Scheduled Caste / Scheduled Tribe community has just lodged a formal grievance:

- Category: {category}
- Location / District: {location or 'Not specified'}
- Active Safety Threat Flag: {'YES - Ongoing Active Danger' if active_threat else 'No immediate armed threat flagged'}
- Complainant Narrative: "{description.strip()}"
- Screening Responses:
{answers_str if answers_str else 'Standard intake'}

Generate a reassuring, institutional, and practical assistance response for the complainant's final confirmation screen.

Strict Requirements:
1. "nhaa_message": A 3 to 4 sentence official message from NHAA. It must address them empathetically, explicitly reassure them that the National Helpline and the District Welfare Officer / Nodal Officer are actively taking up their case under the SC/ST (PoA) Act, and state that their safety and rights are being prioritized. Do NOT use clinical jargon or mention AI models.
2. "recommendations": Exactly 3 to 4 distinct assistance options tailored to their exact situation (e.g. Legal Aid / FIR via DLSA 15100, Mental Health via Tele-MANAS 14416, Police Safety / Escort via 112, or Victim Compensation under Rule 12(4) of the PoA Rules).
Each recommendation must contain:
- "id": string
- "title": short, dignified title in English (e.g. "Free Legal Representation & FIR Guidance")
- "title_hi": authentic Hindi in Devanagari script (e.g. "निःशुल्क कानूनी सहायता एवं एफआईआर मार्गदर्शन")
- "badge": short 2-3 word badge (e.g. "Free Legal Support", "24x7 Mental Health", "Emergency Protection", "Compensation Rights")
- "description": 2 clear sentences explaining how this specific service assists in their situation.
- "action_label": clear call button text (e.g. "Call DLSA 15100", "Call Tele-MANAS 14416", "Emergency 112", "Call NHAA 14566")
- "action_url": tel URI (e.g. "tel:15100", "tel:14416", "tel:112", "tel:14566")
- "type": one of "legal", "mental_health", "emergency", "welfare"

Output valid JSON only with no markdown formatting:
{{
  "nhaa_message": "...",
  "recommendations": [
    {{
      "id": "rec_1",
      "title": "...",
      "title_hi": "...",
      "badge": "...",
      "description": "...",
      "action_label": "...",
      "action_url": "tel:15100",
      "type": "legal"
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
                "content": "You are an expert citizen assistance and triage officer for the Government of India NHAA helpline. Generate precise JSON only."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1200
    }

    try:
        with httpx.Client(timeout=16.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                raw_content = resp.json()["choices"][0]["message"]["content"]
                parsed = extract_json_recs(raw_content)
                if parsed and len(parsed.get("recommendations", [])) >= 2:
                    parsed["source"] = "groq_ai"
                    parsed["status"] = "success"
                    return parsed
    except Exception:
        pass

    return get_recommendation_fallback(category, location)
