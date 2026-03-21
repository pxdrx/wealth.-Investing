"""
Testes obrigatórios — Regras estritas de resultados de eventos.

REGRA SUPREMA: Resultado só existe se foi lido explicitamente do Forex Factory
na execução atual do scraper para o MESMO event_uid.

- test_result_only_if_scraped_now: actual só persiste se FF forneceu na execução atual.
- test_no_cross_event_result_inheritance: nenhum evento herda resultado de outro.
- test_update_requires_event_uid: atualização exige event_uid válido; sem event_uid → não atualiza.
"""

import os
import sqlite3
import sys
import tempfile
from unittest.mock import patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jobs.update_event_results import (
    update_event_results,
    FIXED_WEEK_PRINT_DATE_LABELS,
    ISO_TO_PRINT_DATE_LABEL,
)


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


def test_result_only_if_scraped_now():
    """
    actual só persiste se Forex Factory forneceu na execução atual.
    LIMPEZA INICIAL: todos actual=null. Depois: só repopula do scrape atual.
    """
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        iso_date = "2026-01-26"
        pdl = ISO_TO_PRINT_DATE_LABEL.get(iso_date, "Mon Jan 26")
        _create_test_db(db_path, [
            {
                "id": "e1",
                "date": pdl,
                "time": "09:30",
                "currency": "USD",
                "title": "CPI",
                "event_uid": "evt_abc123",
                "actual": "3.2",  # valor antigo — será limpo
                "actual_source": "forex_factory",
            },
        ])
        # Mock: FF retorna evento COM actual (divulgou)
        mock_scraped = [
            {"date": iso_date, "time": "09:30", "currency": "USD", "title": "CPI", "actual": "3.4"},
        ]
        with patch("forexfactory_week_scraper.get_ff_week_calendar", return_value=mock_scraped):
            result = update_event_results(db_path=db_path, force_refresh=True, dry_run=False)
        assert result.get("success") is True
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT actual, actual_source FROM events WHERE id = 'e1'")
        row = cur.fetchone()
        conn.close()
        # actual deve vir do scrape atual (3.4), não do antigo (3.2)
        assert row[0] == "3.4"
        assert row[1] == "forex_factory"
    finally:
        try:
            if os.path.exists(db_path):
                os.unlink(db_path)
        except OSError:
            pass


def test_no_cross_event_result_inheritance():
    """
    Nenhum evento herda resultado de outro.
    FF tem actual só para evento A. Evento B permanece null.
    """
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        _create_test_db(db_path, [
            {"id": "e1", "date": "Mon Jan 26", "time": "09:30", "currency": "USD", "title": "CPI", "event_uid": "evt_aaa", "actual": None, "actual_source": None},
            {"id": "e2", "date": "Tue Jan 27", "time": "10:00", "currency": "EUR", "title": "GDP", "event_uid": "evt_bbb", "actual": None, "actual_source": None},
        ])
        # FF tem actual APENAS para CPI (e1), não para GDP (e2)
        mock_scraped = [
            {"date": "2026-01-26", "time": "09:30", "currency": "USD", "title": "CPI", "actual": "3.4"},
            {"date": "2026-01-27", "time": "10:00", "currency": "EUR", "title": "GDP", "actual": None},
        ]
        with patch("forexfactory_week_scraper.get_ff_week_calendar", return_value=mock_scraped):
            result = update_event_results(db_path=db_path, force_refresh=True, dry_run=False)
        assert result.get("success") is True
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT actual FROM events WHERE id = 'e1'")
        r1 = cur.fetchone()[0]
        cur.execute("SELECT actual FROM events WHERE id = 'e2'")
        r2 = cur.fetchone()[0]
        conn.close()
        assert r1 == "3.4", "CPI deve ter actual do FF"
        assert r2 is None, "GDP NÃO deve herdar actual de outro evento"
    finally:
        try:
            if os.path.exists(db_path):
                os.unlink(db_path)
        except OSError:
            pass


def test_update_requires_event_uid():
    """
    Atualização exige event_uid válido.
    Se event_uid ausente ou inválido → NÃO atualizar (skipped_no_uid).
    """
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        _create_test_db(db_path, [
            {
                "id": "e1",
                "date": "Mon Jan 26",
                "time": "09:30",
                "currency": "USD",
                "title": "CPI",
                "event_uid": None,  # AUSENTE
                "actual": None,
                "actual_source": None,
            },
        ])
        mock_scraped = [
            {"date": "2026-01-26", "time": "09:30", "currency": "USD", "title": "CPI", "actual": "3.4"},
        ]
        with patch("forexfactory_week_scraper.get_ff_week_calendar", return_value=mock_scraped):
            result = update_event_results(db_path=db_path, force_refresh=True, dry_run=False)
        assert result.get("success") is True
        assert result.get("skipped_no_uid", 0) >= 1, "Deve pular evento sem event_uid"
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT actual FROM events WHERE id = 'e1'")
        row = cur.fetchone()
        conn.close()
        # LIMPEZA zerou; sem event_uid não repopulamos
        assert row[0] is None
    finally:
        try:
            if os.path.exists(db_path):
                os.unlink(db_path)
        except OSError:
            pass


def test_limpeza_inicial_clears_all():
    """LIMPEZA INICIAL: actual e actual_source = null para TODOS os eventos da semana."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        _create_test_db(db_path, [
            {"id": "e1", "date": "Mon Jan 26", "time": "09:30", "currency": "USD", "title": "CPI", "event_uid": "evt_aaa", "actual": "3.2", "actual_source": "forex_factory"},
        ])
        mock_scraped = []  # FF vazio — nada para repopular
        with patch("forexfactory_week_scraper.get_ff_week_calendar", return_value=mock_scraped):
            result = update_event_results(db_path=db_path, force_refresh=True, dry_run=False)
        assert result.get("success") is True
        assert result.get("cleared", 0) >= 1
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT actual, actual_source FROM events WHERE id = 'e1'")
        row = cur.fetchone()
        conn.close()
        assert row[0] is None
        assert row[1] is None
    finally:
        try:
            if os.path.exists(db_path):
                os.unlink(db_path)
        except OSError:
            pass
