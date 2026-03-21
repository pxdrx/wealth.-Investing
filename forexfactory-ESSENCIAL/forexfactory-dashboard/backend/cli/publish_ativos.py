"""
CLI para publicação de "Ativos da Semana" (editorial).
Comandos para operador único atualizar revisões durante a semana.
"""
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional
import typer
from typer import Option

# Adicionar backend ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.ativos_da_semana_editorial import load_ativos_da_semana_config
from config.ftmo_allowlist import load_ftmo_allowlist

app = typer.Typer(help="CLI para publicação de 'Ativos da Semana' (editorial)")

_DATA_DIR = Path(__file__).parent.parent.parent / "data"
_WEEKS_DIR = _DATA_DIR / "weeks"

# Valores permitidos
_EXPOSURE_BUCKETS = ["HEDGE", "USD_FUNDING", "RISK_PROXY", "RATES", "FX_MACRO", "COMMODITY"]
_SCENARIO_ROLES = ["benefit", "hurt", "mixed", "uncertain"]
_CORRELATION_GROUPS = ["usd", "metals", "equities", "rates", "fx", "other"]


@app.command()
def init(
    week_key: str = Option(..., "--week-key", help="Chave da semana (YYYY-MM-DD_to_YYYY-MM-DD)"),
):
    """Inicializa arquivo editorial com estrutura mínima válida."""
    config_path = _WEEKS_DIR / week_key / "ativos_da_semana.editorial.json"
    
    if config_path.exists():
        typer.echo(f"❌ Config já existe: {config_path}", err=True)
        raise typer.Exit(1)
    
    # Verificar allowlist
    allowlist_result = load_ftmo_allowlist(week_key)
    if allowlist_result["status"] != "ok":
        typer.echo(f"❌ Allowlist não disponível: {allowlist_result.get('reason')}", err=True)
        raise typer.Exit(1)
    
    # Criar diretório se não existir
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Estrutura mínima (status unavailable + fallback)
    fallback_symbol = "DXY" if "DXY" in allowlist_result["symbols"] else list(allowlist_result["symbols"])[0]
    
    config_data = {
        "week_key": week_key,
        "source": "editorial_manual",
        "active_revision_id": None,
        "revisions": [],
        "fallback": {
            "symbol": fallback_symbol,
            "label": fallback_symbol,
            "context": "Fallback institucional para monitoramento.",
        },
    }
    
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)
    
    typer.echo(f"✅ Config inicializada: {config_path}")
    typer.echo(f"   Status: unavailable (sem revisões)")
    typer.echo(f"   Fallback: {fallback_symbol}")


@app.command()
def add(
    week_key: str = Option(..., "--week-key", help="Chave da semana"),
    symbol: str = Option(..., "--symbol", help="Símbolo do ativo (ex: EURUSD)"),
    label: str = Option(..., "--label", help="Label para exibição (ex: EURUSD)"),
    context: str = Option("", "--context", help="Context (máx 140 chars, sem termos proibidos)"),
    bucket: str = Option(..., "--bucket", help=f"Exposure bucket: {', '.join(_EXPOSURE_BUCKETS)}"),
    role: str = Option(..., "--role", help=f"Scenario role: {', '.join(_SCENARIO_ROLES)}"),
    group: str = Option(..., "--group", help=f"Correlation group: {', '.join(_CORRELATION_GROUPS)}"),
    confidence: float = Option(0.80, "--confidence", help="Confidence editorial (>= 0.80)"),
):
    """Adiciona item à revisão ativa (ou cria nova revisão)."""
    config_path = _WEEKS_DIR / week_key / "ativos_da_semana.editorial.json"
    
    if not config_path.exists():
        typer.echo(f"❌ Config não encontrada. Execute: publish:ativos:init --week-key={week_key}", err=True)
        raise typer.Exit(1)
    
    # Validar inputs
    if bucket not in _EXPOSURE_BUCKETS:
        typer.echo(f"❌ exposure_bucket inválido: {bucket}. Use: {', '.join(_EXPOSURE_BUCKETS)}", err=True)
        raise typer.Exit(1)
    
    if role not in _SCENARIO_ROLES:
        typer.echo(f"❌ scenario_role inválido: {role}. Use: {', '.join(_SCENARIO_ROLES)}", err=True)
        raise typer.Exit(1)
    
    if group not in _CORRELATION_GROUPS:
        typer.echo(f"❌ correlation_group inválido: {group}. Use: {', '.join(_CORRELATION_GROUPS)}", err=True)
        raise typer.Exit(1)
    
    if confidence < 0.80:
        typer.echo(f"❌ confidence deve ser >= 0.80. Recebido: {confidence}", err=True)
        raise typer.Exit(1)
    
    if context and len(context) > 140:
        typer.echo(f"❌ context excede 140 caracteres: {len(context)}", err=True)
        raise typer.Exit(1)
    
    # Carregar config
    with open(config_path, "r", encoding="utf-8") as f:
        config_data = json.load(f)
    
    # Verificar allowlist
    allowlist_result = load_ftmo_allowlist(week_key)
    if allowlist_result["status"] != "ok":
        typer.echo(f"❌ Allowlist não disponível: {allowlist_result.get('reason')}", err=True)
        raise typer.Exit(1)
    
    if symbol not in allowlist_result["symbols"]:
        typer.echo(f"❌ Símbolo '{symbol}' não está na allowlist FTMO", err=True)
        typer.echo(f"   Símbolos disponíveis: {', '.join(sorted(allowlist_result['symbols']))}", err=True)
        raise typer.Exit(1)
    
    # Obter ou criar revisão ativa
    revisions = config_data.get("revisions", [])
    active_revision_id = config_data.get("active_revision_id")
    
    if active_revision_id:
        active_revision = next((r for r in revisions if r.get("revision_id") == active_revision_id), None)
        if not active_revision:
            active_revision = None
    else:
        active_revision = None
    
    # Se não há revisão ativa, criar nova
    if not active_revision:
        revision_num = len(revisions) + 1
        revision_id = f"rev_{revision_num:03d}"
        now = datetime.now()
        published_label = now.strftime("%a %b %d %H:%M")
        
        active_revision = {
            "revision_id": revision_id,
            "published_label": published_label,
            "items": [],
        }
        revisions.append(active_revision)
        config_data["active_revision_id"] = revision_id
    
    # Verificar duplicatas
    existing_symbols = [item.get("symbol") for item in active_revision.get("items", [])]
    if symbol in existing_symbols:
        typer.echo(f"❌ Símbolo '{symbol}' já existe na revisão ativa", err=True)
        raise typer.Exit(1)
    
    # Adicionar item
    new_item = {
        "symbol": symbol,
        "label": label,
        "context": context,
        "exposure_bucket": bucket,
        "scenario_role": role,
        "correlation_group": group,
        "confidence_editorial": confidence,
    }
    
    active_revision["items"].append(new_item)
    config_data["revisions"] = revisions
    
    # Salvar
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)
    
    typer.echo(f"✅ Item adicionado: {symbol}")
    typer.echo(f"   Revisão: {config_data['active_revision_id']}")
    typer.echo(f"   Total de items: {len(active_revision['items'])}")


@app.command()
def validate(
    week_key: str = Option(..., "--week-key", help="Chave da semana"),
):
    """Valida allowlist FTMO + ativos_da_semana + guardrails + termos proibidos."""
    typer.echo(f"🔍 Validando: {week_key}")
    
    # Validar allowlist
    typer.echo("\n1. Validando allowlist FTMO...")
    allowlist_result = load_ftmo_allowlist(week_key)
    if allowlist_result["status"] != "ok":
        typer.echo(f"   ❌ Allowlist não disponível: {allowlist_result.get('reason')}", err=True)
        raise typer.Exit(1)
    typer.echo(f"   ✅ Allowlist OK ({len(allowlist_result['symbols'])} símbolos)")
    
    # Validar config editorial
    typer.echo("\n2. Validando config editorial...")
    config_result = load_ativos_da_semana_config(week_key)
    
    if config_result["status"] != "ok":
        typer.echo(f"   ❌ Config inválida: {config_result.get('reason')}", err=True)
        raise typer.Exit(1)
    
    typer.echo(f"   ✅ Config OK")
    typer.echo(f"   ✅ Revisão ativa: {config_result.get('active_revision_id')}")
    typer.echo(f"   ✅ Items: {len(config_result.get('items', []))}")
    
    # Validar guardrails (já validados no loader, mas mostrar resumo)
    typer.echo("\n3. Guardrails de realismo:")
    items = config_result.get("_internal", {}).get("scenario_role_by_symbol", {})
    roles = list(items.values())
    buckets = [item.get("exposure_bucket") for item in config_result.get("_internal", {}).get("items_raw", [])]
    groups = [item.get("correlation_group") for item in config_result.get("_internal", {}).get("items_raw", [])]
    
    typer.echo(f"   ✅ Exposure buckets distintos: {len(set(buckets))}")
    typer.echo(f"   ✅ Correlation groups distintos: {len(set(groups))}")
    typer.echo(f"   ✅ Items não-benefit: {sum(1 for r in roles if r in {'mixed', 'uncertain', 'hurt'})}")
    
    typer.echo("\n✅ Validação completa: OK")


if __name__ == "__main__":
    app()
