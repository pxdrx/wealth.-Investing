"""
Job idempotente — Atualização de resultados de eventos (actual).

REGRA SUPREMA: Resultado só existe se foi lido explicitamente do Forex Factory
na execução atual do scraper para o MESMO event_uid.

Implementações obrigatórias:
1. LIMPEZA INICIAL: No início, actual=null e actual_source=null para TODOS os eventos da semana.
2. UPDATE ESTRITO: Atualizar exclusivamente via event_uid. Se event_uid ausente ou inválido → NÃO atualizar.
3. PROIBIÇÕES: Reaproveitar resultados antigos, merge por nome/currency/data, copiar entre eventos.
4. SCRAPE ATÔMICO: Cada execução reflete exatamente o estado atual do Forex Factory.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# Garantir que backend está no path (job pode ser rodado de qualquer dir)
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

# Semana fixa: rótulos do print para filtro.
FIXED_WEEK_PRINT_DATE_LABELS = (
    "Sun Jan 25", "Mon Jan 26", "Tue Jan 27", "Wed Jan 28",
    "Thu Jan 29", "Fri Jan 30", "Sat Jan 31",
)

# Mapeamento ISO date → print_date_label (para matching FF → DB)
ISO_TO_PRINT_DATE_LABEL = {
    "2026-01-25": "Sun Jan 25",
    "2026-01-26": "Mon Jan 26",
    "2026-01-27": "Tue Jan 27",
    "2026-01-28": "Wed Jan 28",
    "2026-01-29": "Thu Jan 29",
    "2026-01-30": "Fri Jan 30",
    "2026-01-31": "Sat Jan 31",
}


def _resolve_db_path(db_path: str) -> str:
    if db_path and os.path.exists(db_path):
        return db_path
    candidate = os.path.join("backend", db_path)
    if os.path.exists(candidate):
        return candidate
    return db_path


def _normalize_time(t: str) -> str:
    """Normaliza rótulo de hora para HH:MM (compatível com DB)."""
    if not t or not isinstance(t, str):
        return "00:00"
    s = t.strip()
    if ":" in s:
        parts = s.split(":", 1)
        try:
            h, m = int(parts[0].strip()), int(parts[1].strip()[:2])
            return f"{h:02d}:{m:02d}"
        except (ValueError, IndexError):
            pass
    return s or "00:00"


def _normalize_title_for_match(title: str) -> str:
    """Normaliza título para matching (mesma lógica que event_identity)."""
    try:
        from utils.event_identity import normalize_event_name
        return normalize_event_name(title or "")
    except Exception:
        return (title or "").lower().strip()


def update_event_results(db_path: str = "mrkt_edge.db", force_refresh: bool = True, dry_run: bool = False) -> Dict[str, Any]:
    """
    Executa atualização atômica:
    1. LIMPEZA INICIAL: actual=null, actual_source=null para TODOS os eventos da semana.
    2. Scrape Forex Factory.
    3. Para cada FF event com actual: match por (print_date_label, print_time_label, currency, title).
    4. Se match único e event_uid presente: UPDATE via event_uid.
    5. Se event_uid ausente ou inválido: NÃO atualizar.
    """
    resolved_db = _resolve_db_path(db_path)
    if not os.path.exists(resolved_db):
        return {"success": False, "reason": f"DB não encontrada em {resolved_db!r}", "updated": 0, "cleared": 0}

    updated_at = datetime.now().isoformat()
    conn = sqlite3.connect(resolved_db)
    cur = conn.cursor()

    # Migração idempotente: actual_source
    try:
        cur.execute("ALTER TABLE events ADD COLUMN actual_source TEXT")
        conn.commit()
    except Exception:
        pass

    # ========== 1. LIMPEZA INICIAL ==========
    # Forçar actual=null e actual_source=null para TODOS os eventos da semana.
    ph = ",".join("?" * len(FIXED_WEEK_PRINT_DATE_LABELS))
    cur.execute(
        f"UPDATE events SET actual = NULL, actual_source = NULL, updated_at = ? WHERE date IN ({ph})",
        (updated_at,) + FIXED_WEEK_PRINT_DATE_LABELS,
    )
    cleared = cur.rowcount or 0
    conn.commit()

    # ========== 2. SCRAPE FOREX FACTORY ==========
    try:
        from forexfactory_week_scraper import get_ff_week_calendar  # type: ignore
        scraped = get_ff_week_calendar(force_refresh=bool(force_refresh)) or []
    except Exception as e:
        conn.close()
        return {"success": False, "reason": f"Falha ao coletar Forex Factory: {e}", "updated": 0, "cleared": cleared}

    # ========== 3. MATCH E UPDATE VIA event_uid ==========
    # Carregar eventos da semana com event_uid para matching.
    try:
        cur.execute(
            f"""
            SELECT id, date, time, currency, title, event_uid
            FROM events
            WHERE date IN ({ph})
            ORDER BY COALESCE(sort_time_key, 0) ASC
            """,
            FIXED_WEEK_PRINT_DATE_LABELS,
        )
    except sqlite3.OperationalError:
        cur.execute(
            f"""
            SELECT id, date, time, currency, title, event_uid
            FROM events
            WHERE date IN ({ph})
            ORDER BY date, time
            """,
            FIXED_WEEK_PRINT_DATE_LABELS,
        )
    db_events = cur.fetchall()

    # Índice: (print_date_label, print_time_label, currency, normalized_title) -> [(id, event_uid), ...]
    match_index: Dict[Tuple[str, str, str, str], List[Tuple[str, Optional[str]]]] = {}
    for row in db_events:
        db_id, pdl, ptl, ccy, title, event_uid = row[0], row[1], row[2], row[3], row[4], row[5]
        key = (pdl or "", _normalize_time(ptl or ""), (ccy or "").strip().upper(), _normalize_title_for_match(title or ""))
        if key not in match_index:
            match_index[key] = []
        match_index[key].append((str(db_id), str(event_uid).strip() if event_uid else None))

    updated = 0
    skipped_no_uid = 0
    skipped_multiple = 0

    for se in scraped:
        if not isinstance(se, dict):
            continue
        actual_val = se.get("actual")
        if actual_val is None or not str(actual_val).strip():
            continue

        ff_date = str(se.get("date") or "").strip()
        ff_time = _normalize_time(str(se.get("time") or ""))
        ff_ccy = (str(se.get("currency") or "").strip().upper()) or "USD"
        ff_title = str(se.get("title") or se.get("event") or "").strip()
        if not ff_title:
            continue

        print_date_label = ISO_TO_PRINT_DATE_LABEL.get(ff_date, ff_date)
        if print_date_label not in FIXED_WEEK_PRINT_DATE_LABELS:
            continue

        key = (print_date_label, ff_time, ff_ccy, _normalize_title_for_match(ff_title))
        candidates = match_index.get(key, [])

        if len(candidates) == 0:
            continue
        if len(candidates) > 1:
            skipped_multiple += 1
            continue

        db_id, event_uid = candidates[0]
        if not event_uid or not event_uid.strip().startswith("evt_"):
            skipped_no_uid += 1
            continue

        if dry_run:
            updated += 1
            continue

        cur.execute(
            "UPDATE events SET actual = ?, actual_source = ?, updated_at = ? WHERE event_uid = ?",
            (str(actual_val).strip(), "forex_factory", updated_at, event_uid),
        )
        updated += int(cur.rowcount or 0)

    if not dry_run:
        conn.commit()
    conn.close()

    return {
        "success": True,
        "reason": None,
        "db_path": resolved_db,
        "cleared": cleared,
        "updated": updated,
        "skipped_no_uid": skipped_no_uid,
        "skipped_multiple": skipped_multiple,
        "dry_run": dry_run,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="mrkt_edge.db", help="Caminho do SQLite")
    parser.add_argument("--no-force-refresh", action="store_true", help="Não forçar refresh do scraper")
    parser.add_argument("--dry-run", action="store_true", help="Não grava; apenas simula")
    args = parser.parse_args()

    result = update_event_results(
        db_path=str(args.db),
        force_refresh=not bool(args.no_force_refresh),
        dry_run=bool(args.dry_run),
    )
    print(result)
    return 0 if result.get("success") else 1


if __name__ == "__main__":
    raise SystemExit(main())
