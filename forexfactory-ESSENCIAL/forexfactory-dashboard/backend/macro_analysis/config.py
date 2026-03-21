# ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES)
"""
MRKT Edge — Macro Analysis Configuration

Configurações centralizadas do módulo macro_analysis.

Responsabilidades:
- Definir paths de diretórios
- Configurar parâmetros de database
- Definir constantes do módulo
- Fornecer configurações padrão

Princípios:
- Configurações mínimas e explícitas
- Valores padrão sensatos
- Fácil de sobrescrever se necessário
- Zero dependências externas complexas
"""

from pathlib import Path
from datetime import date, timedelta


# ============================================================================
# PATHS E DIRETÓRIOS
# ============================================================================

# Diretório raiz do backend
BACKEND_DIR = Path(__file__).parent.parent.resolve()

# Diretório do módulo macro_analysis
MODULE_DIR = Path(__file__).parent.resolve()

# Diretório de outputs (JSON files)
OUTPUTS_DIR = BACKEND_DIR / "outputs" / "macro_analysis"
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# Diretório de documentação
DOCS_DIR = BACKEND_DIR / "docs" / "macro_analysis"
DOCS_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

# Nome da tabela principal
TABLE_NAME = "macro_analysis_institutional"

# Database file (assumindo SQLite, será confirmado via adapter)
# Nota: Path real será obtido de backend/database.py via adapter
DATABASE_FILE = BACKEND_DIR / "mrkt_edge.db"  # Path presumido

# Configurações de database
DATABASE_CONFIG = {
    "table_name": TABLE_NAME,
    "echo": False,  # Log de queries SQL (debug)
    "pool_recycle": 3600,  # Reciclar conexões após 1h
}


# ============================================================================
# VERSIONAMENTO E MUTABILIDADE
# ============================================================================

# Regra de versionamento: 1 análise por semana
VERSIONING_KEY = "week_start"  # Campo usado como chave lógica

# Regra de mutabilidade
# Análise é mutável durante a semana, imutável após week_end
MUTABILITY_RULE = {
    "mutable_condition": "date.today() <= week_end",
    "immutable_condition": "date.today() > week_end",
    "field": "is_frozen",
}


# ============================================================================
# ATIVOS OBRIGATÓRIOS (CONGELADO - ETAPA 6)
# ============================================================================

REQUIRED_ASSETS = [
    "DXY",
    "XAUUSD",
    "S&P 500",
    "Nasdaq",
    "EURUSD",
    "Bitcoin",
]

# Total de ativos obrigatórios
REQUIRED_ASSETS_COUNT = len(REQUIRED_ASSETS)  # 6


# ============================================================================
# REGIÕES OBRIGATÓRIAS (CONGELADO - ETAPA 6)
# ============================================================================

REQUIRED_REGIONS = [
    "Américas",
    "Europa",
    "Ásia-Pacífico",
]

# Total de regiões obrigatórias
REQUIRED_REGIONS_COUNT = len(REQUIRED_REGIONS)  # 3


# ============================================================================
# LIMITES E VALIDAÇÕES
# ============================================================================

# Texto regional: máximo 5 linhas
MAX_REGIONAL_LINES = 5

# Driver macro: limites de caracteres
MIN_DRIVER_MACRO_LENGTH = 20
MAX_DRIVER_MACRO_LENGTH = 500

# Análise narrativa: mínimo de caracteres por seção
MIN_NARRATIVE_SECTION_LENGTH = 100


# ============================================================================
# FORMATO DE NOMES DE ARQUIVO
# ============================================================================

# Formato de nome de arquivo JSON de output
# Exemplo: institutional_analysis_20260104.json
OUTPUT_FILENAME_FORMAT = "institutional_analysis_{week_start}.json"

# Formato de data no nome do arquivo
DATE_FORMAT_FILENAME = "%Y%m%d"  # YYYYMMDD

# Formato de data para display
DATE_FORMAT_DISPLAY = "%d/%m/%Y"  # DD/MM/YYYY


# ============================================================================
# API CONFIGURATION
# ============================================================================

# Limite padrão de resultados para list_analyses()
DEFAULT_LIST_LIMIT = 10

# Máximo de resultados para list_analyses()
MAX_LIST_LIMIT = 100


# ============================================================================
# PROMPT-ÂNCORA — DASHBOARD MACRO (PRINT-LOCK + AUTO-RESULT + NARRATIVE-AWARE)
# ============================================================================
PRINT_LOCK_MODE = True
AUTO_RESULT_UPDATE = True
NARRATIVE_SENSITIVE_EVENTS = True

# ============================================================================
# NARRATIVE_SENSITIVE_EVENTS = TRUE
# ============================================================================
# Lista FECHADA de padrões que identificam evento sensível à narrativa.
# Quando o resultado (Actual) é divulgado, o sistema sinaliza que a narrativa
# PODE precisar de atualização. Não reescreve automaticamente.
# A lista exata é configuração, não decisão do modelo.
# Exemplos ilustrativos: CPI, Payroll, Rate Decision, GDP.
# ============================================================================
NARRATIVE_SENSITIVE_EVENT_PATTERNS = [
    "CPI",
    "PPI",
    "Payroll",
    "Employment",
    "Unemployment",
    "Rate Statement",
    "Overnight Rate",
    "Federal Funds Rate",
    "FOMC Statement",
    "FOMC Press Conference",
    "BOC Rate Statement",
    "BOC Press Conference",
    "BOC Monetary Policy",
    "GDP",
    "Non-Manufacturing PMI",
    "Manufacturing PMI",
    "Consumer Confidence",
    "Retail Sales",
]


def is_narrative_sensitive(event_name: str) -> bool:
    """
    Retorna True se o nome do evento está na lista fechada de sensíveis à narrativa.
    event_name: título do evento (ex.: "CPI m/m", "Federal Funds Rate").
    """
    if not event_name or not isinstance(event_name, str):
        return False
    upper = event_name.strip().upper()
    for pattern in NARRATIVE_SENSITIVE_EVENT_PATTERNS:
        if pattern.upper() in upper:
            return True
    return False


# ============================================================================
# CONFORMIDADE E ESCOPO (CONGELADO - ETAPA 6)
# ============================================================================

# Escopo do módulo: exclusivamente macroeconômico
SCOPE = "macro-only"

# Análise técnica: PROIBIDA
TECHNICAL_ANALYSIS_ENABLED = False

# Níveis de preço: PROIBIDOS
PRICE_LEVELS_ENABLED = False

# Frontend mode
FRONTEND_MODE = "read-only"


# ============================================================================
# METADATA DO MÓDULO
# ============================================================================

MODULE_METADATA = {
    "name": "macro_analysis",
    "version": "1.0.0",
    "scope": SCOPE,
    "technical_analysis": TECHNICAL_ANALYSIS_ENABLED,
    "price_levels": PRICE_LEVELS_ENABLED,
    "frontend_mode": FRONTEND_MODE,
    "required_assets": REQUIRED_ASSETS,
    "required_regions": REQUIRED_REGIONS,
    "versioning_key": VERSIONING_KEY,
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_output_filepath(week_start: date) -> Path:
    """
    Gera path completo do arquivo JSON de output para uma semana.
    
    Args:
        week_start: Data de início da semana (YYYY-MM-DD)
    
    Returns:
        Path: Caminho completo do arquivo JSON
    
    Example:
        >>> get_output_filepath(date(2026, 1, 4))
        Path('.../backend/outputs/macro_analysis/institutional_analysis_20260104.json')
    """
    filename = OUTPUT_FILENAME_FORMAT.format(
        week_start=week_start.strftime(DATE_FORMAT_FILENAME)
    )
    return OUTPUTS_DIR / filename


def get_week_end(week_start: date) -> date:
    """
    Calcula week_end a partir de week_start.
    Assume semana de 7 dias (domingo a sábado).
    
    Args:
        week_start: Data de início da semana
    
    Returns:
        date: Data de fim da semana (week_start + 6 dias)
    
    Example:
        >>> get_week_end(date(2026, 1, 4))  # Domingo
        date(2026, 1, 10)  # Sábado
    """
    return week_start + timedelta(days=6)


def is_week_frozen(week_end: date) -> bool:
    """
    Verifica se uma semana está congelada (imutável).
    
    Regra: Semana congela após week_end (sábado passa).
    
    Args:
        week_end: Data de fim da semana
    
    Returns:
        bool: True se congelada (imutável), False se mutável
    
    Example:
        >>> is_week_frozen(date(2026, 1, 10))  # Sábado
        False  # Se hoje for <= 10/01
        True   # Se hoje for > 10/01
    """
    today = date.today()
    return today > week_end


def get_config() -> dict:
    """
    Retorna todas as configurações do módulo.
    
    Returns:
        dict: Dicionário com todas as configs
    """
    return {
        "paths": {
            "backend_dir": str(BACKEND_DIR),
            "module_dir": str(MODULE_DIR),
            "outputs_dir": str(OUTPUTS_DIR),
            "docs_dir": str(DOCS_DIR),
        },
        "database": DATABASE_CONFIG,
        "versioning": {
            "key": VERSIONING_KEY,
            "mutability_rule": MUTABILITY_RULE,
        },
        "required": {
            "assets": REQUIRED_ASSETS,
            "regions": REQUIRED_REGIONS,
        },
        "limits": {
            "max_regional_lines": MAX_REGIONAL_LINES,
            "min_driver_macro": MIN_DRIVER_MACRO_LENGTH,
            "max_driver_macro": MAX_DRIVER_MACRO_LENGTH,
            "min_narrative_section": MIN_NARRATIVE_SECTION_LENGTH,
        },
        "api": {
            "default_list_limit": DEFAULT_LIST_LIMIT,
            "max_list_limit": MAX_LIST_LIMIT,
        },
        "scope": {
            "type": SCOPE,
            "technical_analysis": TECHNICAL_ANALYSIS_ENABLED,
            "price_levels": PRICE_LEVELS_ENABLED,
            "frontend_mode": FRONTEND_MODE,
        },
        "metadata": MODULE_METADATA,
    }