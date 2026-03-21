"""
Smoke test mínimo (anti-retrabalho).

Falha se:
- frontend não responde em http://localhost:3000 (Vite)
- /analysis/list não retorna 200 com schema estável
- /api/mrkt/realtime-events não retorna 200 com {status:"ok"|"unavailable", items:[...]}

Uso:
  python smoke_test.py
  python smoke_test.py --start   # tenta iniciar backend + frontend e depois valida
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from typing import Any, Optional
from urllib.error import URLError
from urllib.request import Request, urlopen


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://127.0.0.1:8000"


class SmokeTestError(RuntimeError):
    pass


def _http_get(url: str, timeout_s: int = 10) -> tuple[int, str, bytes]:
    req = Request(url, headers={"User-Agent": "smoke-test"})
    with urlopen(req, timeout=timeout_s) as resp:
        status = getattr(resp, "status", 200)
        content_type = resp.headers.get("content-type", "")
        body = resp.read()
        return status, content_type, body


def _wait_http_ok(url: str, timeout_s: int = 60, interval_s: float = 0.5) -> None:
    deadline = time.time() + timeout_s
    last_err: Optional[Exception] = None
    while time.time() < deadline:
        try:
            status, _, _ = _http_get(url, timeout_s=5)
            if status == 200:
                return
        except Exception as e:  # noqa: BLE001 - smoke test: capture last error
            last_err = e
        time.sleep(interval_s)
    raise SmokeTestError(f"Timeout aguardando HTTP 200 em {url}. last_err={last_err!r}")


def _assert(cond: bool, msg: str) -> None:
    if not cond:
        raise SmokeTestError(msg)


def check_frontend() -> None:
    _wait_http_ok(f"{FRONTEND_URL}/", timeout_s=45)
    status, ct, body = _http_get(f"{FRONTEND_URL}/")
    _assert(status == 200, f"Frontend / retornou status={status}")
    _assert("text/html" in (ct or "").lower(), f"Frontend / content-type inesperado: {ct!r}")
    html = body.decode("utf-8", errors="replace")
    _assert("<!DOCTYPE html" in html or "<html" in html, "Frontend / não parece HTML")

    # Garantir que o client do Vite está servindo (minimamente indica que o bundler está OK)
    _wait_http_ok(f"{FRONTEND_URL}/@vite/client", timeout_s=45)
    status2, ct2, body2 = _http_get(f"{FRONTEND_URL}/@vite/client")
    _assert(status2 == 200, f"Frontend /@vite/client retornou status={status2}")
    js = body2.decode("utf-8", errors="replace")
    _assert("HMRContext" in js or "import" in js, "Frontend /@vite/client não parece JS do Vite")


def check_backend() -> None:
    _wait_http_ok(f"{BACKEND_URL}/health", timeout_s=45)

    # /analysis/list: 200 + schema estável
    status, ct, body = _http_get(f"{BACKEND_URL}/analysis/list?limit=50&offset=0")
    _assert(status == 200, f"/analysis/list retornou status={status}")
    _assert("application/json" in (ct or "").lower(), f"/analysis/list content-type inesperado: {ct!r}")
    data = json.loads(body.decode("utf-8", errors="strict"))
    _assert(isinstance(data, dict), "/analysis/list: payload não é objeto")
    _assert("items" in data and "limit" in data and "offset" in data and "total" in data, "/analysis/list: schema inválido")
    _assert(isinstance(data.get("items"), list), "/analysis/list: items não é array")
    _assert(isinstance(data.get("limit"), int), "/analysis/list: limit não é int")
    _assert(isinstance(data.get("offset"), int), "/analysis/list: offset não é int")

    # /api/mrkt/realtime-events: 200 + status + items
    status2, ct2, body2 = _http_get(f"{BACKEND_URL}/api/mrkt/realtime-events")
    _assert(status2 == 200, f"/api/mrkt/realtime-events retornou status={status2}")
    _assert("application/json" in (ct2 or "").lower(), f"/api/mrkt/realtime-events content-type inesperado: {ct2!r}")
    data2 = json.loads(body2.decode("utf-8", errors="strict"))
    _assert(isinstance(data2, dict), "/api/mrkt/realtime-events: payload não é objeto")
    _assert(data2.get("status") in ("ok", "unavailable"), "/api/mrkt/realtime-events: status inválido")
    _assert(isinstance(data2.get("items"), list), "/api/mrkt/realtime-events: items não é array")

    # /api/mrkt/global-rates: 200 + sempre 10 BCs + campos de staleness
    status3, ct3, body3 = _http_get(f"{BACKEND_URL}/api/mrkt/global-rates")
    _assert(status3 == 200, f"/api/mrkt/global-rates retornou status={status3}")
    _assert("application/json" in (ct3 or "").lower(), f"/api/mrkt/global-rates content-type inesperado: {ct3!r}")
    data3 = json.loads(body3.decode("utf-8", errors="strict"))
    _assert(isinstance(data3, dict), "/api/mrkt/global-rates: payload não é objeto")
    _assert(data3.get("success") is True, "/api/mrkt/global-rates: success != true")
    rates = data3.get("rates")
    _assert(isinstance(rates, list), "/api/mrkt/global-rates: rates não é array")
    _assert(len(rates) == 10, f"/api/mrkt/global-rates: esperado 10 BCs, recebido {len(rates)}")
    for i, r in enumerate(rates):
        _assert(isinstance(r, dict), f"/api/mrkt/global-rates: item[{i}] não é objeto")
        _assert(r.get("central_bank") is not None, f"/api/mrkt/global-rates: item[{i}].central_bank é null")
        _assert(r.get("value_label") is not None, f"/api/mrkt/global-rates: item[{i}].value_label é null")
        _assert(r.get("is_stale") in (True, False), f"/api/mrkt/global-rates: item[{i}].is_stale inválido")


def _spawn_backend() -> subprocess.Popen:
    cmd = [sys.executable, "minimal_backend.py"]
    return subprocess.Popen(cmd, cwd=BACKEND_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)


def _spawn_frontend() -> subprocess.Popen:
    npm = shutil.which("npm") or shutil.which("npm.cmd") or "npm"
    cmd = [npm, "run", "dev"]
    return subprocess.Popen(cmd, cwd=ROOT_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", action="store_true", help="tenta iniciar backend + frontend antes de validar")
    args = parser.parse_args()

    procs: list[subprocess.Popen] = []
    try:
        if args.start:
            try:
                procs.append(_spawn_backend())
            except Exception as e:  # noqa: BLE001
                raise SmokeTestError(f"Falha ao iniciar backend: {e!r}") from e
            try:
                procs.append(_spawn_frontend())
            except Exception as e:  # noqa: BLE001
                raise SmokeTestError(f"Falha ao iniciar frontend: {e!r}") from e

        check_frontend()
        check_backend()
        print("SMOKE TEST OK")
        return 0
    except (SmokeTestError, URLError, TimeoutError, json.JSONDecodeError) as e:
        print(f"SMOKE TEST FAIL: {e}", file=sys.stderr)
        return 1
    finally:
        for p in procs:
            try:
                p.terminate()
            except Exception:
                pass


if __name__ == "__main__":
    raise SystemExit(main())

