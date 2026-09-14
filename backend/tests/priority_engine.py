import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.priority import calculate_priority, calculate_context_score

def test_full_fusion():
    res = calculate_priority(
        text_score=80.0,
        text_confidence="High",
        acoustic_score=70.0,
        acoustic_confidence="Medium",
        checkin_score=65.0,
        checkin_confidence="High",
        category="threat_intimidation",
        recency_days=1.0,
        is_ongoing_risk=True,
        vulnerable_group=True,
        safety_flag_active=False
    )
    assert res["priority_score"] >= 75
    assert res["priority_level"] == "Urgent"
    assert res["overall_confidence"] == "High"
    assert res["breakdown"]["acoustic"]["available"] is True
    assert res["breakdown"]["acoustic"]["effective_weight"] == 0.20
    print("✓ Full 4-modality fusion passed:", res["priority_score"], res["priority_level"])

def test_missing_acoustic():
    res = calculate_priority(
        text_score=60.0,
        text_confidence="High",
        acoustic_score=None,
        checkin_score=50.0,
        checkin_confidence="High",
        category="social_boycott",
        recency_days=2.0
    )
    bd = res["breakdown"]
    assert bd["acoustic"]["available"] is False
    assert bd["acoustic"]["effective_weight"] == 0.0
    eff_sum = bd["text"]["effective_weight"] + bd["checkin"]["effective_weight"] + bd["context"]["effective_weight"]
    assert round(eff_sum, 3) == 1.000
    assert res["priority_level"] in ["High", "Moderate"]
    print("✓ Missing acoustic re-normalization passed:", res["priority_score"], res["priority_level"], "effective weights sum:", eff_sum)

def test_critical_override():
    res = calculate_priority(
        text_score=90.0,
        text_confidence="High",
        category="physical_assault",
        safety_flag_active=True,
        safety_flag_type="Immediate Danger",
        safety_flag_detail="Mob surrounded basti with weapons"
    )
    assert res["priority_score"] >= 92
    assert res["priority_level"] == "Urgent"
    assert res["critical_override"] is True
    assert res["safety_flag"]["active"] is True
    print("✓ Critical safety override passed:", res["priority_score"], res["priority_level"])

def test_low_administrative():
    res = calculate_priority(
        text_score=10.0,
        text_confidence="High",
        checkin_score=0.0,
        category="administrative",
        recency_days=45.0,
        is_ongoing_risk=False,
        safety_flag_active=False
    )
    assert res["priority_score"] <= 25
    assert res["priority_level"] in ["Low", "Moderate"]
    print("✓ Low administrative triage passed:", res["priority_score"], res["priority_level"])

def main():
    print("=" * 60)
    print("Running SAATHI Multimodal Priority Calculation Engine Tests")
    print("=" * 60)
    test_full_fusion()
    test_missing_acoustic()
    test_critical_override()
    test_low_administrative()
    print("=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
