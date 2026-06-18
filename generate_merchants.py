"""
generate_merchants.py — Tiqmo Merchant Onboarding Synthetic Dataset
Generates realistic Saudi merchant profiles with risk labels.
Run: python generate_merchants.py
Output: output/merchant_dataset.csv + output/merchant_dataset.json
"""

import json
import random
import pandas as pd
from datetime import date, timedelta
from faker import Faker

fake = Faker("en_US")
random.seed(99)

# ─── CONFIG ──────────────────────────────────────────────────────────────────

N_RECORDS = 400

CATEGORIES = [
    ("food",         0.20),
    ("retail",       0.18),
    ("restaurants",  0.15),
    ("services",     0.14),
    ("electronics",  0.10),
    ("healthcare",   0.08),
    ("transport",    0.08),
    ("education",    0.07),
]

SAUDI_CITIES = [
    "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam",
    "Khobar", "Taif", "Tabuk", "Abha", "Buraidah"
]

# Docs required per category
REQUIRED_DOCS = {
    "food":         ["cr_certificate", "municipal_license", "health_certificate", "owner_id"],
    "retail":       ["cr_certificate", "municipal_license", "owner_id"],
    "restaurants":  ["cr_certificate", "municipal_license", "health_certificate", "owner_id"],
    "services":     ["cr_certificate", "owner_id", "vat_certificate"],
    "electronics":  ["cr_certificate", "owner_id", "vat_certificate"],
    "healthcare":   ["cr_certificate", "moh_license", "owner_id", "vat_certificate"],
    "transport":    ["cr_certificate", "transport_license", "owner_id"],
    "education":    ["cr_certificate", "moe_license", "owner_id"],
}

HIGH_RISK_CATEGORIES = {"transport", "services"}  # higher AML scrutiny


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def weighted_choice(options):
    names, weights = zip(*options)
    return random.choices(names, weights=weights, k=1)[0]

def random_date(start_year, end_year):
    start = date(start_year, 1, 1)
    end   = date(end_year, 12, 31)
    return start + timedelta(days=random.randint(0, (end - start).days))

def saudi_national_id():
    prefix = random.choice(["1", "2"])
    return prefix + "".join([str(random.randint(0, 9)) for _ in range(9)])

def saudi_cr_number():
    return "10" + "".join([str(random.randint(0, 9)) for _ in range(8)])

def business_name(category):
    prefixes = {
        "food":         ["Al Safa", "Noor", "Baraka", "Al Amal"],
        "retail":       ["Al Waha", "Star", "Gulf", "Premium"],
        "restaurants":  ["Najd", "Al Faisaliah", "Bab", "Heritage"],
        "services":     ["Pro", "Elite", "Swift", "Saudi"],
        "electronics":  ["Tech", "Digital", "Smart", "Volt"],
        "healthcare":   ["Care", "Shifa", "Heal", "Med"],
        "transport":    ["Speed", "Go", "Route", "Rapid"],
        "education":    ["Bright", "Learn", "Ilm", "Future"],
    }
    suffixes = ["Co.", "LLC", "Est.", "Group", "Trading"]
    p = random.choice(prefixes.get(category, ["Al"]))
    s = random.choice(suffixes)
    return f"{p} {fake.last_name()} {s}"


# ─── RECORD GENERATOR ────────────────────────────────────────────────────────

def generate_merchant_record(merchant_id):
    category      = weighted_choice(CATEGORIES)
    cr_number     = saudi_cr_number()
    owner_id      = saudi_national_id()
    city          = random.choice(SAUDI_CITIES)
    reg_date      = random_date(2015, 2024)
    required_docs = REQUIRED_DOCS[category]

    # Transaction behavior
    base_vol = {
        "food": (5000, 50000),
        "retail": (8000, 80000),
        "restaurants": (10000, 120000),
        "services": (3000, 30000),
        "electronics": (15000, 200000),
        "healthcare": (5000, 60000),
        "transport": (4000, 40000),
        "education": (3000, 25000),
    }
    vol_range = base_vol[category]
    monthly_vol   = random.randint(*vol_range)
    num_txns      = random.randint(10, 500)
    avg_txn_val   = round(monthly_vol / max(num_txns, 1), 2)

    # Missing docs injection (~30% have at least one missing doc)
    missing_docs = []
    if random.random() < 0.30:
        n_missing = random.randint(1, min(2, len(required_docs)))
        missing_docs = random.sample(required_docs, n_missing)

    # ── RISK FLAGS ──────────────────────────────────────────────────────────
    risk_flags = []

    if missing_docs:
        risk_flags.append("incomplete_documentation")
    if avg_txn_val > 5000:
        risk_flags.append("high_avg_transaction")
    if monthly_vol > 100000:
        risk_flags.append("high_volume")
    if category in HIGH_RISK_CATEGORIES:
        risk_flags.append("high_risk_category")
    if num_txns > 300 and avg_txn_val < 50:
        risk_flags.append("suspicious_micro_transactions")
    if (date.today() - reg_date).days < 90:
        risk_flags.append("newly_registered_business")
    if monthly_vol > 150000 and (date.today() - reg_date).days < 365:
        risk_flags.append("high_volume_new_business")

    # ── RISK LEVEL ──────────────────────────────────────────────────────────
    high_risk_flags = {
        "suspicious_micro_transactions",
        "high_volume_new_business",
        "incomplete_documentation"
    }
    n_high  = sum(1 for f in risk_flags if f in high_risk_flags)
    n_total = len(risk_flags)

    if n_high >= 2 or (n_high == 1 and n_total >= 3):
        risk_level = "high"
    elif n_total >= 2 or n_high == 1:
        risk_level = "medium"
    else:
        risk_level = "low"

    # ── DECISION LOGIC ──────────────────────────────────────────────────────
    if "incomplete_documentation" in risk_flags:
        decision = "rejected"
        reason   = f"Missing required documents: {', '.join(missing_docs)}"
    elif risk_level == "high":
        decision = "escalate"
        reason   = "High risk profile — requires manual review"
    elif risk_level == "medium" and len(risk_flags) >= 2:
        decision = "escalate"
        reason   = "Multiple risk indicators detected"
    else:
        decision = "approved"
        reason   = None

    return {
        "merchant_id":             merchant_id,
        "business_name_en":        business_name(category),
        "business_name_ar":        None,
        "category":                category,
        "cr_number":               cr_number,
        "owner_name":              fake.name(),
        "owner_national_id":       owner_id,
        "registration_date":       reg_date.isoformat(),
        "city":                    city,
        "monthly_transaction_vol": monthly_vol,
        "avg_transaction_value":   avg_txn_val,
        "num_transactions_monthly": num_txns,
        "missing_docs":            missing_docs,
        "risk_level":              risk_level,
        "risk_flags":              risk_flags,
        "decision":                decision,
        "rejection_reason":        reason,
    }


# ─── MAIN ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    records = [
        generate_merchant_record(f"MER-{str(i+1).zfill(4)}")
        for i in range(N_RECORDS)
    ]

    df = pd.DataFrame(records)

    print("✅ Merchant Dataset Generated")
    print(f"   Total records : {len(df)}")
    print(f"\n   Decision dist :")
    print(df["decision"].value_counts().to_string())
    print(f"\n   Risk level dist:")
    print(df["risk_level"].value_counts().to_string())
    print(f"\n   Category dist :")
    print(df["category"].value_counts().to_string())

    df.to_csv("output/merchant_dataset.csv", index=False)
    with open("output/merchant_dataset.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print("\n💾 Saved → output/merchant_dataset.csv")
    print("💾 Saved → output/merchant_dataset.json")
