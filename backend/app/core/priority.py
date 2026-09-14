from typing import Dict, Any, Optional, List

NOMINAL_WEIGHTS = {
    "text": 0.30,
    "acoustic": 0.20,
    "checkin": 0.20,
    "context": 0.30
}

CATEGORY_SEVERITY = {
    "physical_assault": 90.0,
    "threat_intimidation": 85.0,
    "sexual_harassment": 88.0,
    "social_boycott": 75.0,
    "land_dispute": 68.0,
    "caste_slurs": 65.0,
    "police_inaction": 60.0,
    "procedural_roadblock": 50.0,
    "relief_compensation": 30.0,
    "administrative": 20.0,
    "general_inquiry": 15.0,
    "other": 45.0
}

def calculate_context_score(
    category: str,
    recency_days: float = 0.0,
    is_ongoing_risk: bool = False,
    vulnerable_group: bool = False
) -> float:
    cat_key = str(category).strip().lower().replace(" ", "_").replace("-", "_")
    base_score = CATEGORY_SEVERITY.get(cat_key, CATEGORY_SEVERITY["other"])

    adjustment = 0.0
    if recency_days <= 1:
        adjustment += 15.0
    elif recency_days <= 3:
        adjustment += 10.0
    elif recency_days <= 7:
        adjustment += 5.0
    elif recency_days > 30:
        adjustment -= 5.0

    if is_ongoing_risk:
        adjustment += 10.0

    if vulnerable_group:
        adjustment += 5.0

    return float(max(5.0, min(100.0, base_score + adjustment)))

def get_copilot_suggestions(priority_level: str, category: str, safety_active: bool) -> List[str]:
    if safety_active or priority_level == "Urgent":
        return [
            "Are you in a safe place to speak right now, or should I stay quietly on the line with you?",
            "I have raised an immediate priority safety flag. Our supervisor and the District Atrocity Cell are being alerted right now.",
            "Can you confirm your exact current location in case emergency field assistance is dispatched?"
        ]
    elif priority_level == "High":
        return [
            "Thank you for sharing these details with us. We have marked your docket for prioritized human review.",
            "Would you like us to link your case with Tele-MANAS emotional support or DLSA free legal aid services?",
            "Please let us know if the perpetrators are attempting any further contact or intimidation."
        ]
    elif priority_level == "Moderate":
        return [
            "We have recorded your grievance under the NHAA standard support workflow with linked verification.",
            "Your docket tracking reference is active, and our field team will verify the jurisdictional status.",
            "If your situation changes or you feel unsafe, call 14566 immediately to escalate."
        ]
    else:
        return [
            "Your inquiry docket has been successfully lodged in the National Helpline Against Atrocities registry.",
            "You can track status updates via your docket number on the official portal at any time.",
            "Is there any other information or documentation you would like attached to this docket?"
        ]

def calculate_priority(
    text_score: Optional[float] = None,
    text_confidence: str = "High",
    acoustic_score: Optional[float] = None,
    acoustic_confidence: Optional[str] = None,
    checkin_score: Optional[float] = None,
    checkin_confidence: str = "High",
    category: str = "other",
    recency_days: float = 0.0,
    is_ongoing_risk: bool = False,
    vulnerable_group: bool = False,
    safety_flag_active: bool = False,
    safety_flag_type: Optional[str] = None,
    safety_flag_detail: Optional[str] = None,
    detected_emotions: Optional[List[str]] = None
) -> Dict[str, Any]:
    context_score = calculate_context_score(
        category=category,
        recency_days=recency_days,
        is_ongoing_risk=is_ongoing_risk,
        vulnerable_group=vulnerable_group
    )

    available_modalities = {}
    if text_score is not None:
        available_modalities["text"] = float(max(0.0, min(100.0, text_score)))
    if acoustic_score is not None:
        available_modalities["acoustic"] = float(max(0.0, min(100.0, acoustic_score)))
    if checkin_score is not None:
        available_modalities["checkin"] = float(max(0.0, min(100.0, checkin_score)))
    available_modalities["context"] = context_score

    sum_nominal = sum(NOMINAL_WEIGHTS[m] for m in available_modalities)
    if sum_nominal <= 0:
        sum_nominal = 1.0

    breakdown = {}
    fused_score = 0.0

    for modality, nominal_w in NOMINAL_WEIGHTS.items():
        is_avail = modality in available_modalities
        if is_avail:
            eff_w = round(nominal_w / sum_nominal, 4)
            score_val = available_modalities[modality]
            contrib = round(eff_w * score_val, 2)
            fused_score += contrib
            breakdown[modality] = {
                "available": True,
                "nominal_weight": nominal_w,
                "effective_weight": eff_w,
                "score": round(score_val, 1),
                "contribution": contrib
            }
        else:
            breakdown[modality] = {
                "available": False,
                "nominal_weight": nominal_w,
                "effective_weight": 0.0,
                "score": None,
                "contribution": 0.0
            }

    raw_priority = round(fused_score)

    critical_override = False
    if safety_flag_active:
        critical_override = True
    elif text_score is not None and text_score >= 85.0 and detected_emotions:
        if any(e in ["immediate_danger", "panic"] for e in detected_emotions):
            critical_override = True

    if critical_override:
        final_score = int(max(raw_priority, 92))
        priority_level = "Urgent"
        flag_active = True
        flag_type = safety_flag_type or "Immediate Safety Intervention"
        flag_detail = safety_flag_detail or "Critical acute danger indicators detected in statement"
        suggested_action = "Immediate human review & District Atrocity Cell alert — do not delay."
    else:
        final_score = int(max(0, min(100, raw_priority)))
        flag_active = False
        flag_type = "None"
        flag_detail = "Standard verification"

        if final_score >= 75:
            priority_level = "Urgent"
            suggested_action = "Immediate human review & District Atrocity Cell alert — do not delay."
        elif final_score >= 50:
            priority_level = "High"
            suggested_action = "Prioritised human review; consider counselling and legal aid referral."
        elif final_score >= 25:
            priority_level = "Moderate"
            suggested_action = "Standard triage queue; monitor and offer psychological first-aid."
        else:
            priority_level = "Low"
            suggested_action = "Continue normal grievance workflow and routine administrative docketing."

    available_count = len(available_modalities)
    if available_count >= 3 and (text_confidence == "High" or checkin_confidence == "High"):
        overall_confidence = "High"
    elif available_count >= 2:
        overall_confidence = "Medium"
    else:
        overall_confidence = "Low"

    copilot = get_copilot_suggestions(priority_level, category, flag_active)

    return {
        "priority_score": final_score,
        "priority_level": priority_level,
        "overall_confidence": overall_confidence,
        "critical_override": critical_override,
        "safety_flag": {
            "active": flag_active,
            "type": flag_type,
            "detail": flag_detail
        },
        "breakdown": breakdown,
        "suggested_action": suggested_action,
        "copilot_suggestions": copilot
    }
