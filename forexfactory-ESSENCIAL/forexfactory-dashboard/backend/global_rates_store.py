"""
Global Rates Store (MRKT Edge)

Objetivo:
- Refresh a cada 180s (3 min) com tolerância para staleness
- Nunca derrubar o backend se 1 BC falhar
- Sempre retornar 10 BCs suportados (ordem fixa)
- Aplicar override editorial por BC
- Expor metadados de staleness e observabilidade
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import json
import os
import threading
import time
from typing import Callable, Dict, Optional, Tuple, Any, List


SUPPORTED_BCS: List[str] = ["FED", "ECB", "BOE", "BOJ", "BCB", "BOC", "RBA", "PBOC", "BANXICO", "SNB"]

# “3 min” + tolerância (5–6 min pedido). Usar 6 min.
REFRESH_INTERVAL_SECONDS = 180
STALE_TOLERANCE_SECONDS = 360


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _fmt_label(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    # YYYY-MM-DD HH:mm (UTC)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M")


def _safe_str(v: Any) -> str:
    if v is None:
        return ""
    return str(v)


@dataclass
class RateState:
    central_bank: str
    policy_name: str
    value_label: str
    effective_label: str
    source: str  # "auto" | "override"
    last_success_label: str
    last_attempt_label: str
    is_stale: bool
    stale_reason: str
    error_count_rolling: int

    # Interno (health)
    _last_success_ts: Optional[datetime] = None
    _last_attempt_ts: Optional[datetime] = None
    _consecutive_errors: int = 0
    _last_error: str = ""

    def to_public(self) -> Dict[str, Any]:
        # Nunca retornar null.
        return {
            "central_bank": _safe_str(self.central_bank),
            "policy_name": _safe_str(self.policy_name),
            "value_label": _safe_str(self.value_label),
            "effective_label": _safe_str(self.effective_label),
            "source": _safe_str(self.source),
            "last_success_label": _safe_str(self.last_success_label),
            "last_attempt_label": _safe_str(self.last_attempt_label),
            "is_stale": bool(self.is_stale),
            "stale_reason": _safe_str(self.stale_reason),
            "error_count_rolling": int(self.error_count_rolling),
        }

    def to_health(self) -> Dict[str, Any]:
        d = self.to_public()
        d.update(
            {
                "last_error": _safe_str(self._last_error),
                "consecutive_errors": int(self._consecutive_errors),
            }
        )
        return d


def _repo_root() -> str:
    # backend/ -> repo root
    return os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))


def _override_path() -> str:
    return os.path.join(_repo_root(), "data", "overrides", "global_rates.override.json")


def load_overrides() -> Tuple[str, Dict[str, Any]]:
    """
    Retorna (updated_label, overrides_dict).
    Nunca lança para caller (fail-soft).
    """
    path = _override_path()
    try:
        if not os.path.exists(path):
            return "", {}
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f) or {}
        updated_label = _safe_str(raw.get("updated_label"))
        overrides = raw.get("overrides") or {}
        if not isinstance(overrides, dict):
            overrides = {}
        return updated_label, overrides
    except Exception as e:  # noqa: BLE001
        # Em caso de erro de parse, considerar sem override mas reportar via health (store salva erro).
        return "", {"__error__": f"Erro ao ler override: {e}"}


CollectorFn = Callable[[str], Dict[str, str]]
# Deve retornar: {"policy_name": str, "value_label": str, "effective_label": str}


def _default_policy_names() -> Dict[str, str]:
    return {
        "FED": "Fed Funds Target Range",
        "ECB": "Main Refinancing Operations",
        "BOE": "Bank Rate",
        "BOJ": "Policy-Rate Balance",
        "BCB": "Taxa Selic",
        "BOC": "Target for the Overnight Rate",
        "RBA": "Cash Rate Target",
        "PBOC": "Policy Rate",
        "BANXICO": "Tasa de Referencia",
        "SNB": "SNB Policy Rate",
    }


def _seed_from_hardcoded() -> Dict[str, Dict[str, Any]]:
    """
    Seed: usa backend/interest_rates.py como último valor conhecido (pode estar defasado).
    """
    try:
        from interest_rates import CENTRAL_BANKS  # type: ignore
    except Exception:  # noqa: BLE001
        CENTRAL_BANKS = {}
    return CENTRAL_BANKS if isinstance(CENTRAL_BANKS, dict) else {}


def _parse_last_change_date_to_ts(s: str) -> Optional[datetime]:
    try:
        if not s:
            return None
        d = datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        return d
    except Exception:
        return None


class RateStore:
    def __init__(
        self,
        collectors: Optional[Dict[str, CollectorFn]] = None,
        refresh_interval_seconds: int = REFRESH_INTERVAL_SECONDS,
        stale_tolerance_seconds: int = STALE_TOLERANCE_SECONDS,
    ) -> None:
        self.refresh_interval_seconds = int(refresh_interval_seconds)
        self.stale_tolerance_seconds = int(stale_tolerance_seconds)
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._started = False

        self._policy_names = _default_policy_names()
        self._collectors = collectors or {}

        self._overrides_updated_label = ""
        self._overrides_error = ""

        self._last_refresh_started_label = ""
        self._last_refresh_finished_label = ""

        self._states: Dict[str, RateState] = {}
        self._init_seed()

    def _init_seed(self) -> None:
        seed = _seed_from_hardcoded()
        for cb in SUPPORTED_BCS:
            s = seed.get(cb, {}) if isinstance(seed, dict) else {}
            policy_name = self._policy_names.get(cb, cb)
            # value_label inicial: taxa numérica do hardcoded, se existir
            current_rate = s.get("current_rate", "")
            value_label = f"{current_rate}%".replace("%%", "%") if current_rate != "" else ""
            effective_label = ""

            last_change_date = _safe_str(s.get("last_change_date"))
            last_success_ts = _parse_last_change_date_to_ts(last_change_date)

            state = RateState(
                central_bank=cb,
                policy_name=policy_name,
                value_label=_safe_str(value_label),
                effective_label=_safe_str(effective_label),
                source="auto",
                last_success_label=_fmt_label(last_success_ts),
                last_attempt_label="",
                is_stale=True,  # seed é “último conhecido”; considerar defasado até refresh real ou override
                stale_reason="Aguardando atualização automática/override (seed do último valor conhecido).",
                error_count_rolling=0,
                _last_success_ts=last_success_ts,
                _last_attempt_ts=None,
                _consecutive_errors=0,
                _last_error="",
            )
            self._states[cb] = state
        self._recompute_staleness_locked()

    def start_background_refresh(self) -> None:
        with self._lock:
            if self._started:
                return
            self._started = True
            self._thread = threading.Thread(target=self._loop, daemon=True)
            self._thread.start()

        # Primeiro refresh imediatamente (fora do lock)
        try:
            self.refresh_all()
        except Exception:
            # fail-soft
            pass

    def stop_background_refresh(self) -> None:
        self._stop.set()
        t = self._thread
        if t:
            try:
                t.join(timeout=2)
            except Exception:
                pass

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                self.refresh_all()
            except Exception:
                pass
            # Sleep em pequenos passos para permitir stop rápido
            remaining = self.refresh_interval_seconds
            while remaining > 0 and not self._stop.is_set():
                time.sleep(min(1, remaining))
                remaining -= 1

    def _apply_override_if_any(self, cb: str, ov: Dict[str, Any], now: datetime) -> bool:
        """
        Aplica override se existir e for válido. Retorna True se aplicado.
        """
        if not isinstance(ov, dict):
            return False
        entry = ov.get(cb)
        if not entry or not isinstance(entry, dict):
            return False
        value_label = _safe_str(entry.get("value_label")).strip()
        if not value_label:
            return False

        policy_name = _safe_str(entry.get("policy_name")).strip() or self._policy_names.get(cb, cb)
        effective_label = _safe_str(entry.get("effective_label")).strip()

        st = self._states.get(cb)
        if not st:
            return False

        st.policy_name = policy_name
        st.value_label = value_label
        st.effective_label = effective_label
        st.source = "override"
        st._last_success_ts = now
        st.last_success_label = _fmt_label(now)
        st.is_stale = False
        st.stale_reason = ""
        st._consecutive_errors = 0
        return True

    def _collect_auto(self, cb: str) -> Dict[str, str]:
        # Collector específico (injecção/test)
        fn = self._collectors.get(cb)
        if fn:
            return fn(cb)

        # Implementado: FED via CME FedWatch (melhor esforço)
        if cb == "FED":
            from cme_fedwatch_realtime import get_cme_fedwatch_realtime  # type: ignore

            # Observação: get_cme_fedwatch_realtime() já retorna um dict (cache/refresh interno).
            data = get_cme_fedwatch_realtime() or {}
            data_source = _safe_str(data.get("data_source")).lower()
            authoritative = ("fallback" not in data_source)
            raw = _safe_str(data.get("current_rate")).strip()
            # raw geralmente "3.75-4.00"
            if "-" in raw:
                parts = [p.strip() for p in raw.split("-", 1)]
                if len(parts) == 2 and parts[0] and parts[1]:
                    value_label = f"{parts[0]}% – {parts[1]}%"
                else:
                    value_label = f"{raw}%"
            else:
                value_label = f"{raw}%"
            return {
                "__authoritative": authoritative,
                "policy_name": self._policy_names.get("FED", "FED"),
                "value_label": value_label,
                "effective_label": "",
            }

        # Demais BCs: fonte automática ainda não integrada
        raise NotImplementedError("Fonte automática não implementada para este BC.")

    def refresh_all(self) -> None:
        now = _now_utc()
        started_label = _fmt_label(now)
        overrides_updated_label, overrides = load_overrides()

        with self._lock:
            self._overrides_updated_label = overrides_updated_label
            self._overrides_error = _safe_str(overrides.get("__error__")) if isinstance(overrides, dict) else ""
            self._last_refresh_started_label = started_label

        for cb in SUPPORTED_BCS:
            self.refresh_one(cb, overrides=overrides)

        with self._lock:
            self._last_refresh_finished_label = _fmt_label(_now_utc())
            self._recompute_staleness_locked()

    def refresh_one(self, cb: str, overrides: Optional[Dict[str, Any]] = None) -> None:
        now = _now_utc()
        with self._lock:
            st = self._states.get(cb)
            if not st:
                return
            st._last_attempt_ts = now
            st.last_attempt_label = _fmt_label(now)

        # Overrides (aplicados por cima do auto)
        if overrides is None:
            _, overrides = load_overrides()

        with self._lock:
            applied = self._apply_override_if_any(cb, overrides if isinstance(overrides, dict) else {}, now)
        if applied:
            return

        # Auto collect
        try:
            payload = self._collect_auto(cb)
            authoritative = bool(payload.pop("__authoritative", True))
            policy_name = _safe_str(payload.get("policy_name")).strip() or self._policy_names.get(cb, cb)
            value_label = _safe_str(payload.get("value_label")).strip()
            effective_label = _safe_str(payload.get("effective_label")).strip()
            if not value_label:
                raise ValueError("value_label vazio após coleta automática.")

            with self._lock:
                st = self._states.get(cb)
                if not st:
                    return
                st.policy_name = policy_name
                st.value_label = value_label
                st.effective_label = effective_label
                st.source = "auto"
                if authoritative:
                    st._last_success_ts = now
                    st.last_success_label = _fmt_label(now)
                    st._consecutive_errors = 0
                    st._last_error = ""
                    st.error_count_rolling = max(0, int(st.error_count_rolling))  # manter
                else:
                    # CME fallback não deve “mascarar” como fresh.
                    st._consecutive_errors += 1
                    st.error_count_rolling = int(st.error_count_rolling) + 1
                    st._last_error = "CME fallback (dados não confirmados via fonte ao vivo)"
                    st.stale_reason = "Fonte em fallback; mantendo último valor conhecido. Verifique conectividade/fonte."
        except Exception as e:  # noqa: BLE001
            with self._lock:
                st = self._states.get(cb)
                if not st:
                    return
                st._consecutive_errors += 1
                st.error_count_rolling = int(st.error_count_rolling) + 1
                st._last_error = f"{type(e).__name__}: {_safe_str(e)}"

                # Se não há success_ts, deixa como seed.
                # stale_reason curto e institucional
                base_reason = st._last_error or "Falha desconhecida na coleta"
                st.stale_reason = f"Falha de atualização: {base_reason}"

    def _recompute_staleness_locked(self) -> None:
        now = _now_utc()
        for cb in SUPPORTED_BCS:
            st = self._states.get(cb)
            if not st:
                continue
            if st.source == "override" and st.value_label.strip():
                st.is_stale = False
                st.stale_reason = ""
                continue

            # Guardrail: fallback não pode parecer “fresh”
            if cb == "FED" and "fallback" in (st._last_error or "").lower():
                st.is_stale = True
                if not st.stale_reason:
                    st.stale_reason = "Fonte em fallback; atualização ao vivo indisponível."
                continue

            last_success = st._last_success_ts
            if not last_success:
                st.is_stale = True
                if not st.stale_reason:
                    st.stale_reason = "Nunca atualizado com sucesso."
                continue

            age = (now - last_success).total_seconds()
            stale_by_age = age > self.stale_tolerance_seconds
            stale_by_errors = st._consecutive_errors >= 3
            st.is_stale = bool(stale_by_age or stale_by_errors)
            if st.is_stale:
                if not st.stale_reason:
                    st.stale_reason = "Atualização atrasada."
            else:
                st.stale_reason = ""

    def snapshot_public(self) -> Dict[str, Any]:
        with self._lock:
            items = [self._states[cb].to_public() for cb in SUPPORTED_BCS if cb in self._states]
            max_success = ""
            # escolher o maior last_success_label lexicograficamente (formato YYYY-MM-DD HH:mm)
            for it in items:
                ls = _safe_str(it.get("last_success_label"))
                if ls and (not max_success or ls > max_success):
                    max_success = ls
            return {
                "success": True,
                "rates": items,
                "server_time_label": _fmt_label(_now_utc()),
                "max_last_success_label": max_success,
                "refresh_interval_seconds": self.refresh_interval_seconds,
            }

    def snapshot_health(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "success": True,
                "server_time_label": _fmt_label(_now_utc()),
                "worker_running": bool(self._thread and self._thread.is_alive()),
                "refresh_interval_seconds": self.refresh_interval_seconds,
                "stale_tolerance_seconds": self.stale_tolerance_seconds,
                "last_refresh_started_label": _safe_str(self._last_refresh_started_label),
                "last_refresh_finished_label": _safe_str(self._last_refresh_finished_label),
                "overrides_updated_label": _safe_str(self._overrides_updated_label),
                "overrides_error": _safe_str(self._overrides_error),
                "banks": {cb: self._states[cb].to_health() for cb in SUPPORTED_BCS if cb in self._states},
            }


def build_default_store() -> RateStore:
    return RateStore()

