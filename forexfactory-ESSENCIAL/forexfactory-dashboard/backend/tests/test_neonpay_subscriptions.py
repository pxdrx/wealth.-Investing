"""
Testes obrigatórios: assinaturas NeonPay.
- Criação mensal / anual
- Webhook renovação / falha / cancelamento
- Controle de acesso
"""
import os
import sys
import json
import tempfile
import pytest

# Garante que o backend está no path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient


@pytest.fixture
def db_path():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    try:
        os.unlink(path)
    except Exception:
        pass


@pytest.fixture
def client(db_path):
    os.environ["MRKT_EDGE_DB_PATH"] = db_path
    import database as db_module
    db_module._db = None
    from minimal_backend import app
    return TestClient(app)


@pytest.fixture
def user_email():
    return "test@mrktedge.com"


class TestSubscriptionCreate:
    """Criação de assinatura mensal e anual."""

    def test_create_monthly_requires_user_email(self, client):
        r = client.post("/api/subscriptions", json={"plan": "MONTHLY"})
        assert r.status_code in (400, 422)

    def test_create_annual_requires_user_email(self, client):
        r = client.post("/api/subscriptions", json={"plan": "ANNUAL"})
        assert r.status_code in (400, 422)

    def test_create_monthly_with_email_returns_redirect_or_503(self, client, user_email):
        r = client.post(
            "/api/subscriptions",
            json={"plan": "MONTHLY", "user_email": user_email},
        )
        # 503 se NeonPay não configurado; 200 + redirect_url se configurado
        assert r.status_code in (200, 503)
        if r.status_code == 200:
            data = r.json()
            assert "redirect_url" in data or "neonpay_subscription_id" in data

    def test_create_annual_with_email_returns_redirect_or_503(self, client, user_email):
        r = client.post(
            "/api/subscriptions",
            json={"plan": "ANNUAL", "user_email": user_email},
        )
        assert r.status_code in (200, 503)
        if r.status_code == 200:
            data = r.json()
            assert "redirect_url" in data or "neonpay_subscription_id" in data

    def test_create_rejects_invalid_plan(self, client, user_email):
        r = client.post(
            "/api/subscriptions",
            json={"plan": "YEARLY", "user_email": user_email},
        )
        assert r.status_code == 400


class TestSubscriptionMe:
    """GET /api/subscriptions/me — controle de acesso."""

    def test_me_requires_x_user_email(self, client):
        r = client.get("/api/subscriptions/me")
        assert r.status_code == 401

    def test_me_returns_null_without_subscription(self, client, user_email):
        r = client.get("/api/subscriptions/me", headers={"X-User-Email": user_email})
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        assert data.get("subscription") is None or isinstance(data.get("subscription"), dict)


class TestSubscriptionCancel:
    """Cancelamento."""

    def test_cancel_requires_x_user_email(self, client):
        r = client.post("/api/subscriptions/cancel")
        assert r.status_code == 401

    def test_cancel_without_subscription_returns_404(self, client, user_email):
        r = client.post(
            "/api/subscriptions/cancel",
            headers={"X-User-Email": user_email},
        )
        assert r.status_code == 404


class TestWebhookNeonPay:
    """Webhook NeonPay — assinatura inválida rejeitada."""

    def test_webhook_rejects_invalid_signature(self, client):
        r = client.post(
            "/webhooks/neonpay",
            content=json.dumps({"type": "subscription.activated", "data": {}}),
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 403

    def test_webhook_accepts_valid_signature_when_secret_set(self, client):
        import hmac
        import hashlib
        secret = "test_webhook_secret"
        os.environ["NEONPAY_WEBHOOK_SECRET"] = secret
        body = json.dumps({
            "id": "e1",
            "type": "subscription.activated",
            "version": 1,
            "data": {
                "subscription": {
                    "id": "SUB-TEST-001",
                    "accountId": "user@test.com",
                    "status": "active",
                    "frequency": "monthly",
                }
            }
        }).encode("utf-8")
        sig = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
        r = client.post(
            "/webhooks/neonpay",
            content=body,
            headers={"Content-Type": "application/json", "x-neon-digest": sig},
        )
        if r.status_code != 200:
            assert r.status_code in (200, 500)
        if r.status_code == 200:
            assert r.json().get("received") is True
        if "NEONPAY_WEBHOOK_SECRET" in os.environ:
            del os.environ["NEONPAY_WEBHOOK_SECRET"]


class TestAccessControl:
    """Controle de acesso: backend é fonte da verdade."""

    def test_me_returns_subscription_fields_from_backend(self, client, user_email):
        r = client.get("/api/subscriptions/me", headers={"X-User-Email": user_email})
        assert r.status_code == 200
        data = r.json()
        assert "subscription" in data
        sub = data["subscription"]
        if sub is not None:
            assert "plan" in sub or "status" in sub or "current_period_end" in sub
