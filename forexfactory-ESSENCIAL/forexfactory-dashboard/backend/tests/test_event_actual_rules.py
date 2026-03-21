"""
Testes obrigatórios — Regras de actual (resultados de eventos).

REGRA SUPREMA: Se o Forex Factory divulgou o resultado (actual), o sistema DEVE exibir.
- O sistema NÃO bloqueia resultados com base em dia, hora ou cursor interno.
- actual_source = "forex_factory" para todo actual persistido.
- LIMPEZA INICIAL + SCRAPE ATÔMICO: cada execução reflete exatamente o estado do FF.
"""

import os
import sqlite3
import sys
import tempfile
from unittest.mock import patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jobs.update_event_results import update_event_results, ISO_TO_PRINT_DATE_LABEL


def _create_test_db(path: str, events: list) -> None:
    """Cria DB de teste com schema compatível (date, time, currency, title, event_uid)."""
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            time TEXT,
            currency TEXT,
            title TEXT NOT NULL,
            event_uid TEXT,
            actual TEXT,
            actual_source TEXT,
            updated_at TEXT
        )
    """)
    for ev in events:
        cur.execute(
            """INSERT INTO events (id, date, time, currency, title, event_uid, actual, actual_source)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                ev.get("id", "e1"),
                ev.get("date", "Mon Jan 26"),
                ev.get("time", "09:30"),
                ev.get("currency", "USD"),
                ev.get("title", "CPI"),
                ev.get("event_uid"),
                ev.get("actual"),
                ev.get("actual_source"),
            ),
        )
    conn.commit()
    conn.close()


def test_actual_only_when_source_provides():
    """
    actual é atualizado SOMENTE quando forex_factory fornece valor.
    LIMPEZA primeiro; depois só repopula do scrape. Se FF não tem actual → permanece null.
    """
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        _create_test_db(db_path, [
            {"id": "e1", "date": "Mon Jan 26", "time": "09:30", "currency": "USD", "title": "CPI", "event_uid": "evt_abc", "actual": None, "actual_source": None},
        ])
        mock_scraped = [{"date": "2026-01-26", "time": "09:30", "currency": "USD", "title": "CPI", "actual": None}]
        with patch("forexfactory_week_scraper.get_ff_week_calendar", return_value=mock_scraped):
            result = update_event_results(db_path=db_path, force_refresh=True, dry_run=False)
        assert result.get("success") is True
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT actual FROM events WHERE id = 'e1'")
        row = cur.fetchone()
        conn.close()
        assert row[0] is None
    finally:
        try:
            if os.path.exists(db_path):
                os.unlink(db_path)
        except OSError:
            pass


def test_no_cursor_blocks_forex_factory_data():
    """
    O job NÃO filtra eventos por cursor.
    LIMPEZA afeta todos da semana; repopulação vem do scrape.
    """
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        _create_test_db(db_path, [
            {"id": "e1", "date": "Mon Jan 26", "time": "09:30", "currency": "USD", "title": "CPI", "event_uid": "evt_a", "actual": None, "actual_source": None},
            {"id": "e2", "date": "Fri Jan 30", "time": "14:00", "currency": "EUR", "title": "GDP", "event_uid": "evt_b", "actual": None, "actual_source": None},
        ])
        mock_scraped = []
        with patch("forexfactory_week_scraper.get_ff_week_calendar", return_value=mock_scraped):
            result = update_event_results(db_path=db_path, force_refresh=True, dry_run=False)
        assert result.get("success") is True
        assert result.get("cleared", 0) >= 2
    finally:
        try:
            if os.path.exists(db_path):
                os.unlink(db_path)
        except OSError:
            pass


def test_idempotent_event_update():
    """
    LIMPEZA + repopulação: cada execução reflete exatamente o FF.
    Se FF tem actual para evento com event_uid → atualiza.
    Se FF não tem → actual permanece null (já foi limpo).
    """
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        _create_test_db(db_path, [
            {"id": "e1", "date": "Mon Jan 26", "time": "09:30", "currency": "USD", "title": "CPI", "event_uid": "evt_abc", "actual": "3.2", "actual_source": "forex_factory"},
        ])
        mock_scraped = [{"date": "2026-01-26", "time": "09:30", "currency": "USD", "title": "CPI", "actual": "3.5"}]
        with patch("forexfactory_week_scraper.get_ff_week_calendar", return_value=mock_scraped):
            result = update_event_results(db_path=db_path, force_refresh=True, dry_run=False)
        assert result.get("success") is True
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT actual, actual_source FROM events WHERE id = 'e1'")
        row = cur.fetchone()
        conn.close()
        assert row[0] == "3.5"
        assert row[1] == "forex_factory"
    finally:
        try:
            if os.path.exists(db_path):
                os.unlink(db_path)
        except OSError:
            pass
