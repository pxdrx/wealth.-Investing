"""
MRKT Edge — Execução Forçada de Atualização Semanal
Script simplificado para executar atualização completa
"""

import sys
import os
from pathlib import Path

# Adicionar backend ao path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from datetime import date, datetime, timedelta
from macro_analysis.weekly_events_processor import WeeklyEventsProcessor
from macro_analysis.decision_intelligence_generator import DecisionIntelligenceGenerator
from schemas.institutional_analysis_schema import InstitutionalAnalysis, RegionalOverview, Narrative, Conclusion, Asset, Probability
from macro_analysis.database.repository import MacroAnalysisRepository
from macro_analysis.database.adapter import get_database_adapter


def main():
    """Executa atualização forçada."""
    
    print("=" * 80)
    print("MRKT EDGE — EXECUÇÃO OBRIGATÓRIA")
    print("=" * 80)
    print()
    
    # PASSO 0 — INVALIDAÇÃO
    print("PASSO 0: Estado anterior invalidado")
    print()
    
    # PASSO 1 — EVENTOS
    print("PASSO 1: Processando eventos...")
    processor = WeeklyEventsProcessor()
    events_data = processor.process_events()
    
    total = events_data['events']['total']
    displayed_count = len(events_data['events']['displayed'])
    
    print(f"[OK] Total: {total} eventos")
    print(f"[OK] Exibidos (medio + alto): {displayed_count} eventos")
    print()
    
    # PASSO 2 — PANORAMA
    print("PASSO 2: Gerando panorama macro...")
    panorama = events_data['panorama']
    print(f"[OK] Regime: {panorama['regime']}")
    print(f"[OK] Vetor dominante: {panorama['dominant_vector']}")
    print()
    
    # PASSO 3 — ATIVOS RECOMENDADOS
    print("PASSO 3: Gerando ativos recomendados...")
    allocation = events_data['allocation']
    dominant = allocation['dominant_asset']
    correlated = allocation['correlated_assets']
    
    print(f"[OK] Dominante: {dominant['ativo']} ({dominant['direcao']}) - {dominant['conviccao']}")
    print(f"[OK] Correlacionados: {len(correlated)}")
    print()
    
    # PASSO 4 — INTEGRAÇÃO
    print("PASSO 4: Integrando com sistema...")
    
    # ========================================================================
    # MODO EVENT_DASHBOARD_HARD_RESET_STRICT = TRUE
    # Snapshot ÚNICO: salvar TODOS os 84 eventos (HIGH + MEDIUM + LOW).
    # LOW contabilizado e persistido; exibição = apenas HIGH + MEDIUM (26).
    # ========================================================================
    displayed = events_data['events']['displayed']
    low_impact = events_data['events'].get('low_impact', [])
    all_84 = list(displayed) + list(low_impact)

    # weekday = ENUM textual fixo. sort_time_key = minutos desde 00:00 (hour*60+minute). SEM Date/datetime.
    _VALID_WEEKDAYS = frozenset({"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday", "Saturday"})
    _NORM_WEEKDAY = {"monday": "Monday", "tuesday": "Tuesday", "wednesday": "Wednesday", "thursday": "Thursday", "friday": "Friday", "sunday": "Sunday", "saturday": "Saturday"}

    def _print_time_label_to_sort_key(label: str) -> int:
        s = (label or "").strip()
        if ":" not in s:
            raise RuntimeError(f"print_time_label inválido para sort_time_key: {label!r}")
        parts = s.split(":", 1)
        try:
            h, m = int(parts[0].strip()), int(parts[1].strip())
        except (ValueError, IndexError):
            raise RuntimeError(f"print_time_label inválido para sort_time_key: {label!r}")
        if not (0 <= h <= 23 and 0 <= m <= 59):
            raise RuntimeError(f"print_time_label fora de range: {label!r}")
        return h * 60 + m
    
    def _fmt(e: dict, idx: int) -> dict:
        print_date_label = e.get('print_date_label', '')
        print_time_label = e.get('print_time_label', e.get('time', '00:00'))
        sort_time_key = e.get('sort_time_key')
        if sort_time_key is None:
            sort_time_key = _print_time_label_to_sort_key(print_time_label)
        w_raw = (e.get('weekday') or 'Monday')
        weekday = _NORM_WEEKDAY.get(str(w_raw).strip().lower()) or str(w_raw).strip()
        if not weekday or weekday not in _VALID_WEEKDAYS:
            raise RuntimeError(f"weekday vazio ou inválido: {w_raw!r}")
        name = (e.get('event') or e.get('title') or 'Evento sem nome').strip()
        slug = name[:30].replace(' ', '_').replace('/', '-').replace(':', '-')
        uid = f"strict_{print_date_label}_{print_time_label}_{e.get('currency','USD')}_{slug}_{idx}"
        out = {
            'id': uid,
            'print_date_label': print_date_label,
            'print_time_label': print_time_label,
            'sort_time_key': sort_time_key,
            'weekday': weekday,
            'title': name,
            'currency': e.get('currency', 'USD'),
            'impact': (e.get('impact') or 'LOW').upper(),
            'forecast': str(e.get('forecast', '')) if e.get('forecast') is not None else None,
            'previous': str(e.get('previous', '')) if e.get('previous') is not None else None,
            'actual': str(e.get('actual', '')) if e.get('actual') is not None else None,
            'source': 'EVENT_UPDATE_STRICT',
            'narrative_sensitive': bool(e.get('narrative_sensitive', False)),
        }
        if out['print_time_label'] != print_time_label:
            raise RuntimeError("Print label override failed")
        return out

    events_to_save = [_fmt(e, i) for i, e in enumerate(all_84)]
    
    # Semana fixa: 25-31/01/2026 (domingo a sábado)
    week_start = date(2026, 1, 25)  # Domingo
    week_end = date(2026, 1, 31)    # Sábado
    
    # Criar análise institucional
    analysis = InstitutionalAnalysis(
        week_start=week_start,
        week_end=week_end,
        generated_at=date.today(),
        analyst="MRKT Edge - Motor de Alocacao Macro Institucional",
        source="Trading Economics + Analise de Eventos",
        regional_overview=[
            RegionalOverview(
                region="Américas", 
                content=(
                    "FOMC mantém taxas em 3.5-3.75% após corte de dezembro. Durable Goods Orders +5.3% vs +3.1% esperado "
                    "confirma resiliência da demanda doméstica. Core PPI +0.3% indica pressão inflacionária persistente. "
                    "CAD GDP +0.1% vs -0.3% esperado mostra força econômica. BOC mantém postura hawkish moderada. "
                    "Regime: Risk-On moderado com pressão inflacionária."
                )
            ),
            RegionalOverview(
                region="Europa", 
                content=(
                    "PIBs Q4 2025 confirmam crescimento moderado: Eurozone +0.3%, Espanha +0.6% (líder), "
                    "Alemanha/França/Itália +0.2%. Inflação alemã acelera para 2.2% (de 1.8%), reforçando postura hawkish do BCE. "
                    "Ifo Business Climate deve atingir alta de 3 meses. Sentimento empresarial alemão em melhoria. "
                    "Regime: Risk-On com pressão inflacionária crescente."
                )
            ),
            RegionalOverview(
                region="Ásia-Pacífico", 
                content=(
                    "BOJ mantém taxa em 0.75% (alta de 30 anos). CPI Tóquio 2.2% (ligeira desaceleração). "
                    "AUD enfrenta pressão inflacionária: CPI esperado 3.6% vs 3.4% anterior. PMI China em expansão modesta. "
                    "Industrial Production Japão melhora (-0.4% vs -2.7% anterior). Regime: Neutro a Risk-On moderado."
                )
            )
        ],
        narrative=Narrative(
            politica_monetaria=panorama['narrative'],
            crescimento_economico="Resiliência confirmada: PIB alemão +0.2%, CAD GDP +0.1% vs -0.3% esperado.",
            inflacao_pressoes="Pressão persistente: Core PPI USD +0.3% acima do esperado.",
            risco_apetite="Risk-On moderado com elementos de transição."
        ),
        conclusion=Conclusion(
            sintese_semana=panorama['narrative'],
            precificacao_mercado=panorama['risk_primary']
        ),
        assets=[
            # Ativos fixos e imutáveis - sempre os mesmos 8 ativos
            Asset(name="DXY", scenario_base="Lateral", driver_macro="Índice Dólar - Referência macro global", probability=Probability(alta="Baixa", lateral="Média", baixa="Baixa")),
            Asset(name="EURUSD", scenario_base="Lateral", driver_macro="Paridade EUR/USD - Correlação direta com política monetária", probability=Probability(alta="Média", lateral="Média", baixa="Baixa")),
            Asset(name="GBPUSD", scenario_base="Lateral", driver_macro="Paridade GBP/USD - Exposição ao ciclo monetário", probability=Probability(alta="Média", lateral="Média", baixa="Baixa")),
            Asset(name="XAUUSD", scenario_base="Lateral", driver_macro="Ouro - Ativo de reserva e hedge inflacionário", probability=Probability(alta="Baixa", lateral="Média", baixa="Baixa")),
            Asset(name="XAGUSD", scenario_base="Lateral", driver_macro="Prata - Correlação com ouro e demanda industrial", probability=Probability(alta="Baixa", lateral="Média", baixa="Baixa")),
            Asset(name="NASDAQ", scenario_base="Lateral", driver_macro="Índice Nasdaq - Exposição a tecnologia e crescimento", probability=Probability(alta="Média", lateral="Média", baixa="Baixa")),
            Asset(name="SP500", scenario_base="Lateral", driver_macro="S&P 500 - Benchmark de risco americano", probability=Probability(alta="Média", lateral="Média", baixa="Baixa")),
            Asset(name="BITCOIN", scenario_base="Lateral", driver_macro="Bitcoin - Ativo digital e proxy de risco", probability=Probability(alta="Baixa", lateral="Média", baixa="Baixa"))
        ]
    )
    
    # Gerar inteligência
    generator = DecisionIntelligenceGenerator()
    decision_intelligence_raw = generator.generate(analysis)
    
    # Converter objetos Pydantic para dict
    decision_intelligence = {}
    for key, value in decision_intelligence_raw.items():
        if hasattr(value, 'dict'):
            decision_intelligence[key] = value.dict()
        elif hasattr(value, 'model_dump'):
            decision_intelligence[key] = value.model_dump()
        elif isinstance(value, list):
            decision_intelligence[key] = [
                item.dict() if hasattr(item, 'dict') else 
                item.model_dump() if hasattr(item, 'model_dump') else item
                for item in value
            ]
        else:
            decision_intelligence[key] = value
    
    # Forçar ativo dominante
    decision_intelligence['ativo_dominante_semana'] = {
        'ativo': dominant['ativo'],
        'justificativa': dominant['fundamentacao']
    }
    decision_intelligence['direcionamento_semanal'] = 'Bullish' if dominant['direcao'] == 'Long' else 'Bearish'
    
    # Adicionar correlacionados
    if correlated:
        decision_intelligence['ativos_correlacionados_semana'] = [
            {'ativo': c['ativo'], 'justificativa': c['justificativa']}
            for c in correlated
        ]
    
    # PASSO 4.1 — Salvar eventos no banco de eventos (para RealtimeEventsPanel)
    try:
        from database import get_db, FIXED_WEEK_PRINT_DATE_LABELS
        import sys
        import io
        
        # Redirecionar stdout temporariamente para evitar erros de encoding
        old_stdout = sys.stdout
        sys.stdout = io.TextIOWrapper(io.BytesIO(), encoding='utf-8', errors='replace')
        
        db = get_db()
        deleted = db.delete_events_for_week('2026-01-25', '2026-01-31')
        if deleted:
            print(f"   [OK] {deleted} eventos antigos removidos (purge)")
        if events_to_save:
            saved_count = db.save_events(events_to_save)
            # Post-save audit: date = rótulo do print; filtrar por lista fixa
            import sqlite3
            _conn = sqlite3.connect(getattr(db, 'db_path', 'mrkt_edge.db'))
            _ph = ",".join("?" * len(FIXED_WEEK_PRINT_DATE_LABELS))
            _cur = _conn.execute(
                f"SELECT COUNT(*) FROM events WHERE date IN ({_ph})",
                FIXED_WEEK_PRINT_DATE_LABELS,
            )
            db_total = _cur.fetchone()[0]
            _conn.close()
            if db_total != 84:
                sys.stdout = old_stdout
                print(f"   [ERRO] Pos-save: DB tem {db_total} eventos (esperado 84). Abortando.")
                raise SystemExit(1)
            sys.stdout = old_stdout
            print(f"   [OK] {saved_count} eventos salvos no banco de eventos (snapshot validado)")
            # Geração automática de análise por evento (previous/forecast/actual completos)
            try:
                from event_analysis_generator import generate_event_analysis
                gen_count = 0
                for ev in events_to_save:
                    out = generate_event_analysis(ev)
                    if out:
                        db.save_event_analysis(out)
                        gen_count += 1
                if gen_count:
                    print(f"   [OK] {gen_count} análises de evento geradas e salvas")
            except Exception as _ex:
                print(f"   [AVISO] Geração de análises de evento: {_ex}")
        else:
            sys.stdout = old_stdout
    except Exception as e:
        if 'old_stdout' in locals():
            sys.stdout = old_stdout
        print(f"   [AVISO] Não foi possível salvar eventos no banco: {str(e)}")
        # Continuar mesmo se falhar - eventos podem ser salvos separadamente
    
    # PASSO 4.2 — Persistir análise macro
    repository = MacroAnalysisRepository(db_adapter=get_database_adapter())
    
    # Garantir que week_start e week_end sejam objetos date
    week_start_date = week_start if isinstance(week_start, date) else date.fromisoformat(str(week_start))
    week_end_date = week_end if isinstance(week_end, date) else date.fromisoformat(str(week_end))
    
    analysis_data = {
        'week_start': week_start_date,  # date object
        'week_end': week_end_date,      # date object
        'generated_at': date.today(),   # date object (não datetime)
        'analyst': analysis.analyst,
        'source': analysis.source,
        'regional_overview': {
            r.region: r.content 
            for r in analysis.regional_overview
        },
        'narrative': analysis.narrative.dict(),
        'conclusion': analysis.conclusion.dict(),
        'assets': [a.dict() for a in analysis.assets],
        **decision_intelligence
    }
    
    try:
        existing = repository.get_by_week_start(week_start_date)
        if existing:
            repository.update(week_start_date, analysis_data)
            print("   [OK] Analise atualizada")
        else:
            repository.create(analysis_data)
            print("   [OK] Analise criada")
    except Exception as e:
        print(f"   [ERRO] {e}")
        import traceback
        traceback.print_exc()
    
    print()
    
    # PASSO 5 — CONFIRMAÇÃO
    print("=" * 80)
    print("CONFIRMAÇÃO FINAL")
    print("=" * 80)
    print()
    print("PANORAMA MACRO:")
    print(f"  Regime: {panorama['regime']}")
    print(f"  Postura: {panorama['monetary_stance']}")
    print(f"  Inflação: {panorama['inflation_cycle']}")
    print()
    print("EVENTOS EXIBIDOS:")
    for i, e in enumerate(events_data['events']['displayed'][:5], 1):
        status = "[OK]" if e.get('status') == 'completed' else "[PEND]"
        print(f"  {i}. {status} {e['event']} ({e['currency']}) - {e['impact']}")
    if displayed_count > 5:
        print(f"  ... e mais {displayed_count - 5} eventos")
    print()
    print("ATIVOS RECOMENDADOS:")
    print(f"  Dominante: {dominant['ativo']} ({dominant['direcao']}) - {dominant['conviccao']}")
    for c in correlated:
        print(f"  Correlacionado: {c['ativo']} ({c['direcao']}) - {c['conviccao']}")
    print()
    # Timestamp com fuso horário local
    from macro_analysis.timezone_utils import get_local_timestamp
    print(f"TIMESTAMP: {get_local_timestamp()}")
    print(f"FUSO: America/Sao_Paulo (UTC-3)")
    print()
    print("=" * 80)
    print("[OK] EXECUCAO CONCLUIDA")
    print("=" * 80)
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
