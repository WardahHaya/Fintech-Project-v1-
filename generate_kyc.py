"""
generate_kyc.py — Tiqmo KYC Synthetic Dataset Generator
Generates realistic Saudi-context KYC records with labelled outcomes.
Run: python generate_kyc.py
Output: output/kyc_dataset.csv + output/kyc_dataset.json
"""

import json
import random
import uuid
import pandas as pd
from datetime import date, timedelta
from faker import Faker

fake_en = Faker("en_US")
fake_ar = Faker("ar_AA")
random.seed(42)

# ─── CONFIG ──────────────────────────────────────────────────────────────────

N_RECORDS = 500

NATIONALITIES = [
    ("Saudi Arabia", 0.45),
    ("Egypt", 0.12),
    ("India", 0.10),
    ("Pakistan", 0.08),
    ("Philippines", 0.06),
    ("Bangladesh", 0.05),
    ("Yemen", 0.04),
    ("Syria", 0.03),
    ("Sudan", 0.03),
    ("Other", 0.04),
]

SAUDI_CITIES = [
    "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam",
    "Khobar", "Taif", "Tabuk", "Abha", "Buraidah"
]

RISK_NATIONALITIES = {"Yemen", "Syria", "Sudan"}  # higher AML scrutiny


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def weighted_choice(options):
    names, weights = zip(*options)
    return random.choices(names, weights=weights, k=1)[0]

def random_date(start_year, end_year):
    start = date(start_year, 1, 1)
    end   = date(end_year, 12, 31)
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))

def saudi_phone():
    return "+9665" + "".join([str(random.randint(0, 9)) for _ in range(8)])

def saudi_national_id(nationality):
    # Citizens start with 1, residents (Iqama) start with 2
    prefix = "1" if nationality == "Saudi Arabia" else "2"
    return prefix + "".join([str(random.randint(0, 9)) for _ in range(9)])

def saudi_cr_number():
    return "10" + "".join([str(random.randint(0, 9)) for _ in range(8)])

def doc_type_for(nationality):
    if nationality == "Saudi Arabia":
        return "national_id"
    return random.choice(["passport", "iqama"])


# ─── RECORD GENERATOR ────────────────────────────────────────────────────────

def generate_kyc_record(record_id, force_scenario=None):
    nationality = weighted_choice(NATIONALITIES)
    doc_type    = doc_type_for(nationality)
    nat_id      = saudi_national_id(nationality)

    # Age — most users are 18–60; inject some edge cases
    age = random.choices(
        population=["underage", "normal", "senior"],
        weights=[0.04, 0.88, 0.08]
    )[0]
    if age == "underage":
        dob = random_date(date.today().year - 17, date.today().year - 10)
        age_val = (date.today() - dob).days // 365
    elif age == "senior":
        dob = random_date(1945, 1970)
        age_val = (date.today() - dob).days // 365
    else:
        dob = random_date(1970, 2005)
        age_val = (date.today() - dob).days // 365

    # Document dates
    issue_date  = random_date(2015, 2023)
    # Inject ~15% expired docs
    expired     = random.random() < 0.15
    if expired:
        expiry_date = random_date(2018, 2024)
        while expiry_date >= date.today():
            expiry_date = random_date(2018, 2024)
    else:
        expiry_date = random_date(2025, 2030)

    # Selfie match score (lower = higher risk)
    selfie_score = round(random.gauss(0.82, 0.12), 3)
    selfie_score = max(0.0, min(1.0, selfie_score))

    # Name match score (form vs document)
    name_scenario = random.random()
    if name_scenario < 0.08:
        name_match = round(random.uniform(0.3, 0.59), 3)   # clear mismatch
    elif name_scenario < 0.15:
        name_match = round(random.uniform(0.6, 0.74), 3)   # partial mismatch
    else:
        name_match = round(random.uniform(0.85, 1.0), 3)   # match

    # Duplicate flag (~3%)
    duplicate = random.random() < 0.03

    # Names
    full_name_en = fake_en.name()
    full_name_ar = fake_ar.name() if random.random() < 0.6 else None

    # ── RISK FLAGS ──────────────────────────────────────────────────────────
    risk_flags = []

    if expired:
        risk_flags.append("expired_document")
    if selfie_score < 0.60:
        risk_flags.append("low_selfie_match")
    if name_match < 0.75:
        risk_flags.append("name_mismatch")
    if age_val < 18:
        risk_flags.append("underage")
    if duplicate:
        risk_flags.append("duplicate_id")
    if nationality in RISK_NATIONALITIES:
        risk_flags.append("high_risk_nationality")
    if selfie_score < 0.75 and name_match < 0.8:
        risk_flags.append("identity_uncertainty")

    # ── LABEL LOGIC ─────────────────────────────────────────────────────────
    hard_reject_flags = {"expired_document", "underage", "duplicate_id", "name_mismatch"}
    hard_reject        = bool(risk_flags and any(f in hard_reject_flags for f in risk_flags))
    soft_flags         = [f for f in risk_flags if f not in hard_reject_flags]

    if hard_reject:
        label  = "rejected"
        reason = next((f for f in risk_flags if f in hard_reject_flags), "policy_violation")
    elif len(soft_flags) >= 2 or (selfie_score < 0.70):
        label  = "manual_review"
        reason = "multiple_soft_risk_flags"
    elif len(risk_flags) == 0 and selfie_score >= 0.80 and name_match >= 0.85:
        label  = "approved"
        reason = None
    else:
        label  = "approved"
        reason = None

    return {
        "record_id":           str(record_id),
        "full_name_en":        full_name_en,
        "full_name_ar":        full_name_ar,
        "national_id":         nat_id,
        "document_type":       doc_type,
        "nationality":         nationality,
        "dob":                 dob.isoformat(),
        "issue_date":          issue_date.isoformat(),
        "expiry_date":         expiry_date.isoformat(),
        "is_expired":          expired,
        "selfie_match_score":  selfie_score,
        "name_match_score":    name_match,
        "address":             f"{random.choice(SAUDI_CITIES)}, Saudi Arabia",
        "phone":               saudi_phone(),
        "risk_flags":          risk_flags,
        "age":                 age_val,
        "is_underage":         age_val < 18,
        "duplicate_flag":      duplicate,
        "label":               label,
        "rejection_reason":    reason,
    }


# ─── MAIN ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    records = []

    # Ensure label distribution is meaningful
    for i in range(N_RECORDS):
        rec = generate_kyc_record(f"KYC-{str(i+1).zfill(5)}")
        records.append(rec)

    df = pd.DataFrame(records)

    # Print distribution
    print("✅ KYC Dataset Generated")
    print(f"   Total records : {len(df)}")
    print(f"   Label dist    :")
    print(df["label"].value_counts().to_string())
    print(f"\n   Top risk flags:")
    from collections import Counter
    all_flags = [f for flags in df["risk_flags"] for f in flags]
    for flag, count in Counter(all_flags).most_common(8):
        print(f"   • {flag}: {count}")

    # Save
    df.to_csv("output/kyc_dataset.csv", index=False)

    # JSON (keep risk_flags as list)
    with open("output/kyc_dataset.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print("\n💾 Saved → output/kyc_dataset.csv")
    print("💾 Saved → output/kyc_dataset.json")
