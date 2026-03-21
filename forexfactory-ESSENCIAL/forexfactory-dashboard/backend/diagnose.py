import sys
from pathlib import Path

backend_dir = Path(__file__).parent
print(f"Backend dir: {backend_dir}")
print(f"Exists: {backend_dir.exists()}")

# Verificar arquivos críticos
critical_files = [
    "institutional_analysis_pipeline.py",
    "schemas/institutional_analysis_schema.py",
    "macro_analysis/integration.py",
    "macro_analysis/database/adapter.py",
    "test_analysis_20260112.md"
]

print("\n=== ARQUIVOS CRÍTICOS ===")
for file in critical_files:
    path = backend_dir / file
    print(f"{'✅' if path.exists() else '❌'} {file}")

print("\n=== PYTHON PATH ===")
for p in sys.path[:5]:
    print(f"  {p}")