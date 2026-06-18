"""
run_pipeline.py — Tiqmo Data Strategy: Run All Generators
Generates all 3 datasets in one command.
Run: python run_pipeline.py
"""

import subprocess
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

scripts = [
    ("KYC Dataset",            "generate_kyc.py"),
    ("Merchant Dataset",       "generate_merchants.py"),
    ("Compliance RAG Corpus",  "build_compliance_corpus.py"),
]

print("=" * 55)
print("  TIQMO DATA STRATEGY — FULL PIPELINE")
print("=" * 55)

for label, script in scripts:
    print(f"\n▶ Running: {label}")
    print("-" * 40)
    result = subprocess.run(
        [sys.executable, script],
        capture_output=False,
        text=True
    )
    if result.returncode != 0:
        print(f"❌ Failed: {script}")
        sys.exit(1)

print("\n" + "=" * 55)
print("  ✅ ALL DATASETS GENERATED SUCCESSFULLY")
print("=" * 55)
print("\nOutput files:")
for f in sorted(os.listdir("output")):
    size = os.path.getsize(f"output/{f}")
    print(f"  • output/{f}  ({size:,} bytes)")
