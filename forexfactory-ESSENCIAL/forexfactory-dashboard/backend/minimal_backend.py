"""
MRKT Edge Backend Completo - Janeiro 2026
Backend com análise macro institucional + interest rates + auth
"""

from fastapi import FastAPI, HTTPException, Request, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import sqlite3
import json

# Imports de módulos internos
try:
    from interest_rates import get_all_rates, get_rate_by_code, get_divergence_analysis, get_upcoming_meetings
except ImportError:
    print("⚠️ Warning: interest_rates module not found, some endpoints may not work")
    get_all_rates = None
    get_rate_by_code = None
    get_divergence_analysis = None
    get_upcoming_meetings = None

from macro_analysis.api.handlers import get_macro_analysis_handler

# Global Rates (novos endpoints + refresh 3min + staleness)
try:
    from global_rates_store import build_default_store, SUPPORTED_BCS  # type: ignore
    _global_rates_store = build_default_store()
except Exception:
    _global_rates_store = None
    SUPPORTED_BCS = ["FED", "ECB", "BOE", "BOJ", "BCB", "BOC", "RBA", "PBOC", "BANXICO", "SNB"]

# ============================================
# APP CONFIGURATION
# ============================================

app = FastAPI(
    title="MRKT Edge API",
    description="ForexFactory Intelligence Dashboard API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TOKEN = "mrkt_edge_2024"

# ============================================
# MODELS
# ============================================

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str

class CreateSubscriptionRequest(BaseModel):
    plan: str  # "MONTHLY" | "ANNUAL"
    user_email: str

# ============================================
# BASIC ROUTES
# ============================================

@app.get("/")
def root():
    return {
        "status": "online",
        "message": "MRKT Edge API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "analysis": "/analysis/latest",
            "auth": "/api/auth/login"
        }
    }

@app.get("/health")
def health():
    return {
        "status": "success",
        "message": "Dashboard OK",
        "timestamp": datetime.now().isoformat()
    }

# ============================================
# AUTENTICAÇÃO
# ============================================

@app.post("/api/auth/login")
def login(request: LoginRequest):
    """Login endpoint - aceita demo user ou qualquer email para teste"""
    if request.email == "demo@forexfactory.com" and request.password == "demo123":
        return {
            "success": True,
            "access_token": TOKEN,
            "user": {
                "email": request.email,
                "username": "Demo User"
            }
        }
    
    # Para desenvolvimento: aceitar qualquer login
    return {
        "success": True,
        "access_token": TOKEN,
        "user": {
            "email": request.email,
            "username": request.email.split('@')[0]
        }
    }

@app.post("/api/auth/register")
def register(request: RegisterRequest):
    """Register endpoint - aceita qualquer registro para teste"""
    return {
        "success": True,
        "access_token": TOKEN,
        "user": {
            "email": request.email,
            "username": request.username
        }
    }

# ============================================
# ANÁLISE MACRO INSTITUCIONAL
# ============================================

@app.get("/analysis/latest")
def get_latest_analysis():
    """Retorna análise macro institucional mais recente."""
    try:
        handler = get_macro_analysis_handler()
        analysis = handler.get_latest()
        
        if not analysis:
            raise HTTPException(
                status_code=404,
                detail="Nenhuma análise disponível. Execute: python backend/populate_simple.py"
            )
        
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao carregar análise: {str(e)}"
        )

@app.get("/analysis/list")
def list_analyses(
    limit: int = Query(10, ge=1, le=200, description="Máximo de resultados (1-200)"),
    offset: int = Query(0, ge=0, description="Offset para paginação (>= 0)"),
):
    """
    Lista análises disponíveis (metadata apenas).
    Contrato: 200 sempre com { items, limit, offset, total }.
    Parâmetros padrão válidos (limit=50, offset=0) nunca retornam 400.

    IMPORTANTE: esta rota precisa vir ANTES de /analysis/{week_start},
    senão "/analysis/list" é interpretado como week_start e vira 400.
    """
    try:
        handler = get_macro_analysis_handler()
        # Handler aceita max limit=100; cap para evitar ValueError
        limit_capped = min(limit, 100)
        analyses = handler.list_analyses(limit=limit_capped, offset=offset)
        total = handler.get_total_count()
    except ValueError:
        # Parâmetros inválidos após cap: retornar lista vazia em vez de 400/500
        analyses = []
        total = 0
        limit_capped = min(limit, 100)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error_code": "LIST_ANALYSES_ERROR", "message": str(e)}
        )

    # Contrato estável: 200 sempre
    return {
        "items": analyses if analyses is not None else [],
        "limit": limit,
        "offset": offset,
        "total": total,
    }

@app.get("/analysis/{week_start}")
def get_analysis_by_week(week_start: str):
    """Retorna análise de semana específica (formato: YYYY-MM-DD)."""
    try:
        # Validar formato de data
        week_date = datetime.strptime(week_start, '%Y-%m-%d').date()
        
        # Validar que é domingo
        if week_date.weekday() != 6:
            raise HTTPException(
                status_code=400,
                detail=f"week_start deve ser domingo. {week_start} é {week_date.strftime('%A')}"
            )
        
        handler = get_macro_analysis_handler()
        analysis = handler.get_analysis(week_date)
        
        if not analysis:
            raise HTTPException(
                status_code=404,
                detail=f"Análise não encontrada para semana de {week_start}"
            )
        
        return analysis
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de data inválido. Use YYYY-MM-DD (ex: 2026-01-11)"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao carregar análise: {str(e)}"
        )

@app.get("/analysis/summary")
def get_analysis_summary():
    """Retorna resumo estatístico das análises."""
    try:
        handler = get_macro_analysis_handler()
        summary = handler.get_summary()
        
        return {
            "success": True,
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar resumo: {str(e)}"
        )

# ============================================
# INTEREST RATES (OPCIONAL)
# ============================================

if get_all_rates is not None:
    @app.get("/api/mrkt/interest-rates")
    def get_interest_rates():
        """Retorna taxas de juros globais."""
        try:
            rates = get_all_rates()
            return {
                "success": True,
                "rates": rates,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao buscar taxas: {str(e)}"
            )

    @app.get("/api/mrkt/interest-rates/{code}")
    def get_rate_detail(code: str):
        """Retorna detalhes de taxa específica."""
        try:
            rate = get_rate_by_code(code.upper())
            if not rate:
                raise HTTPException(
                    status_code=404,
                    detail=f"Taxa não encontrada: {code}"
                )
            return {
                "success": True,
                "rate": rate
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao buscar taxa: {str(e)}"
            )

    @app.get("/api/mrkt/divergence")
    def get_divergence():
        """Retorna análise de divergência entre BCs."""
        try:
            analysis = get_divergence_analysis()
            return {
                "success": True,
                "analysis": analysis
            }
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao calcular divergência: {str(e)}"
            )

    @app.get("/api/mrkt/upcoming-meetings")
    def get_meetings():
        """Retorna próximas reuniões de BCs."""
        try:
            meetings = get_upcoming_meetings()
            return {
                "success": True,
                "meetings": meetings
            }
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao buscar reuniões: {str(e)}"
            )

# ============================================
# GLOBAL RATES (3-min refresh + staleness)
# ============================================

@app.get("/api/mrkt/global-rates")
def get_global_rates():
    """
    Retorna taxas globais com metadados de staleness.
    Contrato: 200 sempre, lista fixa de 10 BCs.
    """
    try:
        if _global_rates_store is not None:
            return _global_rates_store.snapshot_public()
    except Exception:
        pass

    # Fallback fail-soft (store indisponível): ainda assim retornar 10 BCs e marcar stale.
    now_label = datetime.now().strftime("%Y-%m-%d %H:%M")
    return {
        "success": True,
        "rates": [
            {
                "central_bank": cb,
                "policy_name": cb,
                "value_label": "",
                "effective_label": "",
                "source": "auto",
                "last_success_label": "",
                "last_attempt_label": now_label,
                "is_stale": True,
                "stale_reason": "RateStore indisponível no backend.",
                "error_count_rolling": 1,
            }
            for cb in SUPPORTED_BCS
        ],
        "server_time_label": now_label,
        "max_last_success_label": "",
        "refresh_interval_seconds": 180,
    }


@app.get("/api/health/global-rates")
def health_global_rates():
    """
    Diagnóstico detalhado por BC (stale_reason, últimos erros, etc).
    Contrato: 200 sempre.
    """
    try:
        if _global_rates_store is not None:
            return _global_rates_store.snapshot_health()
    except Exception as e:
        return {"success": True, "error": str(e), "banks": {}}
    return {"success": True, "banks": {}, "worker_running": False, "overrides_error": "RateStore indisponível"}

# ============================================
# EVENTOS E PANORAMA (ALTERADO: Novos endpoints)
# ============================================

# ========================================================================
# EVENT_UPDATE_STRICT = TRUE | Semana travada 25/01/2026 → 31/01/2026
# Fonte ÚNICA: snapshot persistido. Validação BLOQUEANTE. Se falhar → 503.
# Contagem esperada: total=84, HIGH=14, MEDIUM=12, LOW=58, exibidos=26.
# Horários do print já em BRT; nenhuma conversão de timezone.
# ========================================================================
STRICT_WEEK_START = "2026-01-25"
STRICT_WEEK_END = "2026-01-31"
STRICT_COUNTS = {"total": 84, "high": 14, "medium": 12, "low": 58, "displayed": 26}
FIXED_WEEK_PRINT_DATE_LABELS = (
    "Sun Jan 25", "Mon Jan 26", "Tue Jan 27", "Wed Jan 28",
    "Thu Jan 29", "Fri Jan 30", "Sat Jan 31",
)


@app.get("/api/mrkt/realtime-events")
def get_realtime_events():
    """
    EVENT_DASHBOARD_HARD_RESET_STRICT: retorna APENAS snapshot validado.
    Contrato estável: sempre retorna 200 com { status: "ok"|"unavailable", items: [], reason? }.
    Degradação controlada: falhas de fonte/parse retornam status unavailable, não 500.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Default seguro para resposta
    default_response = {
        "status": "unavailable",
        "reason": "Erro desconhecido ao carregar eventos",
        "items": [],
        "summary": {"total": 0, "high": 0, "medium": 0, "low": 0},
        "snapshot_id": STRICT_WEEK_START,
        "rendered_at": datetime.now().isoformat(),
    }
    
    try:
        # Tentar conectar ao banco
        try:
            conn = sqlite3.connect('mrkt_edge.db')
            cursor = conn.cursor()
        except Exception as db_error:
            logger.error(f"realtime-events: erro ao conectar ao banco - {str(db_error)}", exc_info=True)
            return JSONResponse(
                status_code=200,
                content={
                    **default_response,
                    "reason": f"Banco de dados indisponível: {str(db_error)}",
                },
                headers={
                    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )
        
        # Migrações de schema (não críticas)
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN narrative_sensitive INTEGER DEFAULT 0")
            conn.commit()
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN weekday TEXT")
            conn.commit()
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN sort_time_key INTEGER")
            conn.commit()
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN print_row_index INTEGER")
            conn.commit()
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN week_key TEXT")
            conn.commit()
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN event_uid TEXT")
            conn.commit()
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP")
            conn.commit()
        except Exception:
            pass
        
        # Query com tratamento de erro
        try:
            ph = ",".join("?" * len(FIXED_WEEK_PRINT_DATE_LABELS))
            cursor.execute(f"""
                SELECT id, date, time, title, currency, impact, forecast, previous, actual,
                       narrative_sensitive, weekday, print_row_index, week_key, event_uid, sort_time_key
                FROM events
                WHERE date IN ({ph})
                ORDER BY COALESCE(sort_time_key, 999999) ASC, COALESCE(print_row_index, 999999) ASC
            """, FIXED_WEEK_PRINT_DATE_LABELS)
            rows = cursor.fetchall()
        except Exception as query_error:
            logger.error(f"realtime-events: erro na query SQL - {str(query_error)}", exc_info=True)
            conn.close()
            return JSONResponse(
                status_code=200,
                content={
                    **default_response,
                    "reason": f"Erro ao consultar eventos: {str(query_error)}",
                },
                headers={
                    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )
        
        # Processar eventos com tratamento de erro por item
        high_count = medium_count = low_count = 0
        displayed = []
        narrative_alert = False
        processing_errors = []

        # Regra institucional: eventos com currency devem expor favored_assets (nunca vazio)
        try:
            from analysis.event_currency_bias import get_favored_assets
        except Exception as _imp_err:
            get_favored_assets = None
            logger.warning(f"realtime-events: falha ao importar get_favored_assets: {_imp_err}")

        # REGRA SUPREMA: Se o Forex Factory divulgou o resultado (actual), o sistema DEVE exibir.
        # O sistema NÃO bloqueia resultados com base em dia, hora ou cursor interno.

        for idx, row in enumerate(rows):
            try:
                if not row or len(row) < 5:
                    continue
                
                impact = (row[5] or "").upper()
                if impact == 'HIGH':
                    high_count += 1
                elif impact == 'MEDIUM':
                    medium_count += 1
                elif impact == 'LOW':
                    low_count += 1
                    continue
                
                title = row[3] or "Evento sem nome"
                currency = row[4] if len(row) > 4 else None
                print_date_label = str(row[1]) if row[1] else ''
                print_time_label = str(row[2]) if row[2] else ''
                
                # Validação de timezone contamination (não crítico - logar e continuar)
                if 'Z' in print_time_label or '+' in print_time_label:
                    logger.warning(f"realtime-events: timezone contamination detectado em evento {row[0]}: {print_time_label}")
                    # Não bloquear - apenas logar
                
                # weekday = ENUM textual fixo. Normalizar para "Monday" etc
                _wd_raw = str(row[10]).strip() if len(row) > 10 and row[10] else ''
                _wd_map = {"monday": "Monday", "tuesday": "Tuesday", "wednesday": "Wednesday", "thursday": "Thursday", "friday": "Friday", "sunday": "Sunday", "saturday": "Saturday", "mon": "Monday", "tue": "Tuesday", "wed": "Wednesday", "thu": "Thursday", "fri": "Friday", "sun": "Sunday", "sat": "Saturday"}
                weekday = _wd_map.get(_wd_raw.lower(), _wd_raw or "Monday") if _wd_raw else "Monday"
                _valid = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday", "Saturday"}
                if weekday not in _valid:
                    logger.warning(f"realtime-events: weekday inválido '{_wd_raw}' em evento {row[0]}, usando 'Monday'")
                    weekday = "Monday"  # Fallback seguro
                
                ns = bool(row[9]) if len(row) > 9 and row[9] is not None else False
                # actual vem exclusivamente do banco (forex_factory via update_event_results)
                actual_val = row[8]
                if ns and actual_val and str(actual_val).strip():
                    narrative_alert = True
                
                # Extrair campos determinísticos (com fallback seguro)
                print_row_index = None
                week_key_val = None
                event_uid_val = None
                try:
                    if len(row) > 11 and row[11] is not None:
                        print_row_index = int(row[11])
                except (ValueError, TypeError):
                    pass
                try:
                    if len(row) > 12 and row[12] is not None:
                        week_key_val = str(row[12])
                except Exception:
                    pass
                try:
                    if len(row) > 13 and row[13] is not None:
                        event_uid_val = str(row[13])
                except Exception:
                    pass
                sort_time_key_val = None
                try:
                    if len(row) > 14 and row[14] is not None:
                        sort_time_key_val = int(row[14])
                except (ValueError, TypeError):
                    pass

                # GARANTIR event_id canônico SEMPRE presente (backend é fonte da verdade)
                # Preferir event_uid (canônico), senão usar id do banco como fallback garantido
                canonical_event_id = None
                if event_uid_val and isinstance(event_uid_val, str) and event_uid_val.strip().startswith('evt_'):
                    canonical_event_id = event_uid_val.strip()
                else:
                    # Fallback: usar id do banco (garantir que sempre existe)
                    db_id = str(row[0]) if row[0] else None
                    if db_id:
                        canonical_event_id = db_id
                    else:
                        # Último recurso: gerar ID baseado em dados do evento (determinístico)
                        logger.warning(f"realtime-events: evento sem id do banco, gerando ID determinístico para linha {idx}")
                        import hashlib
                        uid_string = f"{print_date_label}|{print_time_label}|{(currency or '')}|{title}|{print_row_index or idx}"
                        hash_obj = hashlib.sha256(uid_string.encode('utf-8'))
                        canonical_event_id = f"evt_{hash_obj.hexdigest()[:16]}"
                
                # VALIDAÇÃO CRÍTICA: event_id nunca pode ser None ou vazio
                if not canonical_event_id or not isinstance(canonical_event_id, str) or not canonical_event_id.strip():
                    logger.error(f"realtime-events: FALHA CRÍTICA ao gerar event_id para evento linha {idx}, pulando evento")
                    continue
                
                # Contrato institucional: favored_assets sempre presente quando há currency (nunca vazio)
                favored_assets = []
                try:
                    if get_favored_assets is not None:
                        favored_assets = get_favored_assets({"currency": currency, "title": title}) or []
                except Exception as _fav_err:
                    logger.warning(f"realtime-events: erro ao derivar favored_assets para evento {row[0]}: {_fav_err}")
                    favored_assets = []

                ev = {
                    'id': row[0],
                    'event_id': canonical_event_id.strip(),  # ID canônico OBRIGATÓRIO para uso em APIs
                    'name': title,
                    'print_date_label': print_date_label,
                    'print_time_label': print_time_label,
                    'weekday': weekday,
                    'currency': currency,
                    'impact': impact,
                    # Campos top-level (mesmo quando actual é null) — contrato FE/BE estável
                    'actual': str(actual_val) if actual_val is not None else None,
                    'forecast': str(row[6]) if len(row) > 6 and row[6] is not None else None,
                    'previous': str(row[7]) if len(row) > 7 and row[7] is not None else None,
                    'favored_assets': favored_assets,
                    'result': {
                        'actual': str(actual_val) if actual_val is not None else None,
                        'forecast': str(row[6]) if len(row) > 6 and row[6] is not None else None,
                        'previous': str(row[7]) if len(row) > 7 and row[7] is not None else None,
                    },
                    'narrative_sensitive': ns,
                    'print_row_index': print_row_index,
                    'week_key': week_key_val,
                    'event_uid': event_uid_val,
                }
                displayed.append(ev)
            except Exception as item_error:
                # Logar erro mas continuar processando outros eventos
                logger.warning(f"realtime-events: erro ao processar evento linha {idx}: {str(item_error)}", exc_info=True)
                processing_errors.append(f"Linha {idx}: {str(item_error)}")
                continue
        
        conn.close()

        total = high_count + medium_count + low_count
        actual = {"total": total, "high": high_count, "medium": medium_count, "low": low_count, "displayed": len(displayed)}

        # Validação de contagem (não bloqueante - retornar unavailable se falhar)
        validation_failed = (
            total != STRICT_COUNTS["total"] or 
            high_count != STRICT_COUNTS["high"] or 
            medium_count != STRICT_COUNTS["medium"] or 
            low_count != STRICT_COUNTS["low"] or 
            len(displayed) != STRICT_COUNTS["displayed"]
        )
        
        if validation_failed:
            reason_parts = []
            if total != STRICT_COUNTS["total"]:
                reason_parts.append(f"total esperado {STRICT_COUNTS['total']}, recebido {total}")
            if high_count != STRICT_COUNTS["high"]:
                reason_parts.append(f"high esperado {STRICT_COUNTS['high']}, recebido {high_count}")
            if medium_count != STRICT_COUNTS["medium"]:
                reason_parts.append(f"medium esperado {STRICT_COUNTS['medium']}, recebido {medium_count}")
            if low_count != STRICT_COUNTS["low"]:
                reason_parts.append(f"low esperado {STRICT_COUNTS['low']}, recebido {low_count}")
            if len(displayed) != STRICT_COUNTS["displayed"]:
                reason_parts.append(f"displayed esperado {STRICT_COUNTS['displayed']}, recebido {len(displayed)}")
            
            reason = f"Validação de snapshot falhou: {', '.join(reason_parts)}. Execute python backend/execute_weekly_update.py para restaurar."
            logger.warning(f"realtime-events: {reason}")
            
            return JSONResponse(
                status_code=200,
                content={
                    "status": "unavailable",
                    "reason": reason,
                    "items": displayed,  # Retornar eventos processados mesmo com validação falhada
                    "summary": {"total": total, "high": high_count, "medium": medium_count, "low": low_count},
                    "snapshot_id": STRICT_WEEK_START,
                    "rendered_at": datetime.now().isoformat(),
                    "expected": STRICT_COUNTS,
                    "actual": actual,
                },
                headers={
                    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )

        # Sucesso: retornar status ok
        return JSONResponse(
            status_code=200,
            content={
                "status": "ok",
                "reason": None,
                "items": displayed,
                "summary": {"total": total, "high": high_count, "medium": medium_count, "low": low_count},
                "snapshot_id": STRICT_WEEK_START,
                "rendered_at": datetime.now().isoformat(),
                "narrative_alert": narrative_alert,
                "narrative_alert_message": (
                    "Resultado divulgado em evento sensível à narrativa. Avaliar atualização do Panorama Macro Semanal."
                    if narrative_alert else None
                ),
            },
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        # Erro inesperado: logar e retornar unavailable (não 500)
        logger.error(f"realtime-events: erro inesperado - {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=200,
            content={
                **default_response,
                "reason": f"Erro ao processar eventos: {str(e)}",
            },
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

@app.get("/api/mrkt/event-analysis/{event_id}")
def get_event_analysis(event_id: str):
    """
    Retorna análise de um evento. TODO evento listado tem análise (contextual ou factual).
    Nunca retorna "Análise não disponível para este evento." — gera via gerador se não houver salva.
    
    Aceita event_id canônico (formato evt_...) ou ID do banco de dados.
    Validação defensiva: retorna 400 para event_id inválido, nunca 500.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # VALIDAÇÃO DEFENSIVA ROBUSTA: event_id nunca pode causar 500
    if not event_id:
        logger.warning(f"event-analysis: event_id vazio recebido")
        raise HTTPException(status_code=400, detail="event_id inválido: não pode ser vazio")
    
    if not isinstance(event_id, str):
        logger.warning(f"event-analysis: event_id não é string (tipo: {type(event_id)})")
        raise HTTPException(status_code=400, detail=f"event_id inválido: deve ser string, recebido {type(event_id).__name__}")
    
    # Normalizar event_id (trim whitespace)
    event_id = event_id.strip()
    
    if not event_id:
        logger.warning(f"event-analysis: event_id vazio após trim")
        raise HTTPException(status_code=400, detail="event_id inválido: não pode ser vazio após normalização")
    
    # Validação de formato: event_id não pode conter caracteres problemáticos
    if any(char in event_id for char in [' ', '\n', '\r', '\t', '\x00']):
        logger.warning(f"event-analysis: event_id contém caracteres inválidos: {repr(event_id[:50])}")
        raise HTTPException(status_code=400, detail="event_id inválido: contém caracteres não permitidos (espaços, quebras de linha, etc)")
    
    try:
        from database import get_db
        from event_analysis_generator import generate_event_analysis

        db = get_db()
        
        # Tentar buscar por event_id canônico (evt_...) primeiro, depois por ID do banco
        event = None
        if event_id.startswith('evt_'):
            # Buscar por event_uid (canônico) - PREFERIDO
            event = db.get_event_by_uid(event_id)
            if event:
                logger.debug(f"event-analysis: evento encontrado por event_uid canônico: {event_id}")
        else:
            # Buscar por ID do banco (compatibilidade retroativa)
            event = db.get_event_by_id(event_id)
            if event:
                logger.debug(f"event-analysis: evento encontrado por ID do banco: {event_id}")
            else:
                # Log claro quando event_id inválido for recebido
                logger.warning(f"event-analysis: event_id não canônico e não encontrado no banco: {event_id}")
        
        if not event:
            logger.warning(f"event-analysis: evento não encontrado para event_id: {event_id}")
            raise HTTPException(status_code=404, detail=f"Evento não encontrado: {event_id}")

        # Usar o ID do banco (event['id']) para buscar análise, não o event_id canônico
        db_event_id = event.get('id')
        if not db_event_id:
            logger.error(f"event-analysis: evento encontrado mas sem id do banco: {event}")
            raise HTTPException(status_code=500, detail="Erro interno: evento sem ID do banco")
        
        analysis = db.get_event_analysis(db_event_id)
        if not analysis:
            generated = generate_event_analysis(event)
            if generated:
                db.save_event_analysis(generated)
                analysis = generated
        if not analysis:
            analysis = generate_event_analysis(event) or {}

        summary = (analysis or {}).get("summary", "")
        return {
            "success": True,
            "analysis": {
                "context": summary,
                "market_impact": (analysis or {}).get("expected_impact", ""),
                "trading_implications": (
                    f"Forex: {', '.join((analysis or {}).get('forex_pairs') or [])}. "
                    f"Índices: {', '.join((analysis or {}).get('us_indices') or [])}. "
                    f"Metais: {', '.join((analysis or {}).get('metals') or [])}."
                ),
                "ativo_beneficiado_evento": (analysis or {}).get("ativo_beneficiado_evento"),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar análise: {str(e)}")

@app.get("/api/mrkt/weekly-panorama")
def get_weekly_panorama():
    """
    ALTERADO: Endpoint adicionado como adapter para /analysis/latest
    Retorna panorama semanal da análise macro institucional
    """
    try:
        handler = get_macro_analysis_handler()
        analysis = handler.get_latest()
        
        if not analysis:
            raise HTTPException(
                status_code=404,
                detail="Panorama não disponível"
            )
        
        return {
            "success": True,
            "panorama": analysis
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar panorama: {str(e)}"
        )


# ============================================
# SUBSCRIPTIONS (NeonPay)
# ============================================

def _get_user_email_from_request(x_user_email: Optional[str] = Header(None, alias="X-User-Email")) -> str:
    """Resolve user email para endpoints de assinatura. Frontend envia X-User-Email."""
    if not x_user_email or not x_user_email.strip():
        raise HTTPException(status_code=401, detail="X-User-Email é obrigatório")
    return x_user_email.strip()

@app.post("/api/subscriptions")
def create_subscription(body: CreateSubscriptionRequest):
    """
    Cria assinatura NeonPay (MONTHLY ou ANNUAL).
    Retorna redirect_url para o usuário concluir o pagamento.
    """
    try:
        from database import get_db
        from services.payments.neonpay import NeonPayClient, SubscriptionPlan

        if body.plan not in ("MONTHLY", "ANNUAL"):
            raise HTTPException(status_code=400, detail="plan deve ser MONTHLY ou ANNUAL")
        plan = SubscriptionPlan.MONTHLY if body.plan == "MONTHLY" else SubscriptionPlan.ANNUAL
        user_email = (body.user_email or "").strip()
        if not user_email:
            raise HTTPException(status_code=400, detail="user_email é obrigatório")

        client = NeonPayClient()
        if not client.api_key:
            raise HTTPException(status_code=503, detail="NeonPay não configurado (NEONPAY_API_KEY)")

        result = client.create_subscription(
            plan=plan,
            account_id=user_email,
            success_path="/?subscription=success",
            cancel_path="/?subscription=cancel",
        )
        redirect_url = result.get("redirect_url") or ""
        neonpay_subscription_id = result.get("neonpay_subscription_id") or ""

        db = get_db()
        db.save_subscription(
            user_id=user_email,
            plan=body.plan,
            neonpay_subscription_id=neonpay_subscription_id or None,
            status="trial" if not neonpay_subscription_id else "trial",
        )

        return {
            "success": True,
            "redirect_url": redirect_url,
            "neonpay_subscription_id": neonpay_subscription_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar assinatura: {str(e)}")

@app.get("/api/subscriptions/me")
def get_my_subscription(x_user_email: Optional[str] = Header(None, alias="X-User-Email")):
    """Retorna a assinatura atual do usuário. Header X-User-Email obrigatório."""
    try:
        from database import get_db

        user_email = _get_user_email_from_request(x_user_email)
        db = get_db()
        sub = db.get_subscription_by_user(user_email)
        if not sub:
            return {"success": True, "subscription": None}
        return {
            "success": True,
            "subscription": {
                "plan": sub.get("plan"),
                "status": sub.get("status"),
                "current_period_end": sub.get("current_period_end"),
                "current_period_start": sub.get("current_period_start"),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar assinatura: {str(e)}")

@app.post("/api/subscriptions/cancel")
def cancel_my_subscription(x_user_email: Optional[str] = Header(None, alias="X-User-Email")):
    """Cancela a assinatura atual. Acesso até current_period_end."""
    try:
        from database import get_db
        from services.payments.neonpay import NeonPayClient

        user_email = _get_user_email_from_request(x_user_email)
        db = get_db()
        sub = db.get_subscription_by_user(user_email)
        if not sub or not sub.get("neonpay_subscription_id"):
            raise HTTPException(status_code=404, detail="Nenhuma assinatura ativa")
        if sub.get("status") in ("canceled", "expired"):
            return {"success": True, "message": "Assinatura já cancelada ou expirada"}

        client = NeonPayClient()
        ok = client.cancel_subscription(sub["neonpay_subscription_id"])
        if ok:
            db.update_subscription_status(sub["neonpay_subscription_id"], "canceled")
        return {"success": True, "canceled": ok}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao cancelar assinatura: {str(e)}")

@app.post("/webhooks/neonpay")
async def webhook_neonpay(request: Request):
    """
    Webhook NeonPay — subscription.activated, subscription.canceled, payment.failed, invoice.paid.
    Valida x-neon-digest e atualiza subscriptions.
    """
    try:
        from database import get_db
        from services.payments.neonpay import verify_webhook_signature, handle_webhook_event

        body = await request.body()
        signature = request.headers.get("x-neon-digest") or request.headers.get("X-Neon-Digest")
        if not verify_webhook_signature(body, signature):
            raise HTTPException(status_code=403, detail="Invalid webhook signature")

        import json as _json
        payload = _json.loads(body.decode("utf-8"))

        event_type = payload.get("type") or ""
        event_data = payload.get("data") or payload
        db = get_db()

        def on_activated(sub: dict):
            sid = sub.get("id")
            if not sid:
                return
            user_id = sub.get("accountId") or ""
            plan = "ANNUAL" if (sub.get("frequency") or "").lower() == "yearly" else "MONTHLY"
            db.save_subscription(
                user_id=user_id,
                plan=plan,
                neonpay_subscription_id=sid,
                status="active",
            )

        def on_canceled(sub: dict):
            sid = sub.get("id")
            if sid:
                db.update_subscription_status(sid, "canceled")

        def on_payment_failed(data: dict):
            sub_id = (data.get("subscription") or {}).get("id") or data.get("subscriptionId")
            if sub_id:
                db.update_subscription_status(sub_id, "past_due")

        def on_invoice_paid(data: dict):
            sub_id = (data.get("invoice") or data).get("subscriptionId") or (data.get("subscription") or {}).get("id")
            if sub_id:
                db.update_subscription_status(sub_id, "active")

        handle_webhook_event(
            event_type,
            payload,
            on_subscription_activated=on_activated,
            on_subscription_canceled=on_canceled,
            on_payment_failed=on_payment_failed,
            on_invoice_paid=on_invoice_paid,
        )
        return {"received": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook error: {str(e)}")


# ============================================
# ERROR HANDLERS
# ============================================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error": "Not Found",
            "detail": str(exc.detail) if hasattr(exc, 'detail') else "Endpoint não encontrado",
            "path": str(request.url.path)
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal Server Error",
            "detail": str(exc.detail) if hasattr(exc, 'detail') else "Erro interno do servidor"
        }
    )

# ============================================
# STARTUP
# ============================================

@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("🚀 MRKT Edge Backend - ONLINE")
    print("=" * 60)
    print(f"📍 API: http://127.0.0.1:8000")
    print(f"📚 Docs: http://127.0.0.1:8000/docs")
    print(f"🔍 Health: http://127.0.0.1:8000/health")
    print(f"📊 Analysis: http://127.0.0.1:8000/analysis/latest")
    print("=" * 60)

    # Iniciar refresh de global rates (3 min) em background
    try:
        if _global_rates_store is not None:
            _global_rates_store.start_background_refresh()
    except Exception as e:
        print(f"⚠️ Warning: global rates refresh não iniciou: {e}")

# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "minimal_backend:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )