"""
Loader para allowlist FTMO versionada por week_key.
Snapshot congelado por semana.
"""
import json
import os
from pathlib import Path
from typing import Dict, Set, Optional

# Caminho base para dados
_DATA_DIR = Path(__file__).parent.parent.parent / "data"
_ALLOWLISTS_DIR = _DATA_DIR / "allowlists"
_INDEX_FILE = _ALLOWLISTS_DIR / "index.json"


def load_ftmo_allowlist(week_key: str) -> Dict:
    """
    Carrega allowlist FTMO para week_key específico.
    
    Args:
        week_key: Chave da semana (formato: "YYYY-MM-DD_to_YYYY-MM-DD")
    
    Returns:
        {
            "status": "ok" | "unavailable",
            "snapshot_date": str (se ok),
            "symbols": Set[str] (se ok),
            "reason": str (se unavailable)
        }
    """
    if not _ALLOWLISTS_DIR.exists():
        return {
            "status": "unavailable",
            "reason": "Diretório de allowlists não encontrado",
        }
    
    # Carregar índice
    if not _INDEX_FILE.exists():
        return {
            "status": "unavailable",
            "reason": f"Índice de allowlists não encontrado: {_INDEX_FILE}",
        }
    
    try:
        with open(_INDEX_FILE, "r", encoding="utf-8") as f:
            index = json.load(f)
    except Exception as e:
        return {
            "status": "unavailable",
            "reason": f"Erro ao carregar índice: {str(e)}",
        }
    
    # Buscar snapshot para week_key
    snapshot_filename = index.get(week_key)
    if not snapshot_filename:
        return {
            "status": "unavailable",
            "reason": f"Allowlist não encontrada para week_key: {week_key}",
        }
    
    snapshot_path = _ALLOWLISTS_DIR / snapshot_filename
    if not snapshot_path.exists():
        return {
            "status": "unavailable",
            "reason": f"Snapshot não encontrado: {snapshot_path}",
        }
    
    try:
        with open(snapshot_path, "r", encoding="utf-8") as f:
            snapshot_data = json.load(f)
    except Exception as e:
        return {
            "status": "unavailable",
            "reason": f"Erro ao carregar snapshot: {str(e)}",
        }
    
    symbols_list = snapshot_data.get("symbols", [])
    if not symbols_list:
        return {
            "status": "unavailable",
            "reason": "Snapshot vazio ou sem símbolos",
        }
    
    return {
        "status": "ok",
        "snapshot_date": snapshot_data.get("snapshot_date", ""),
        "symbols": set(symbols_list),
        "reason": None,
    }


def get_allowlist_symbols(week_key: str) -> Set[str]:
    """
    Retorna Set de símbolos da allowlist FTMO para week_key.
    Retorna set vazio se não disponível.
    """
    result = load_ftmo_allowlist(week_key)
    if result["status"] == "ok":
        return result["symbols"]
    return set()
