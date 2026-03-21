"""
Cliente NeonPay — criação de assinatura, consulta e cancelamento.
https://docs.neonpay.com/docs/subscriptions-beta
"""
import os
import logging
from typing import Optional, Dict, Any

import requests

from .enums import SubscriptionPlan

logger = logging.getLogger(__name__)

NEONPAY_BASE = os.environ.get("NEONPAY_API_BASE", "https://api.neonpay.com")


class NeonPayClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        sku_monthly: Optional[str] = None,
        sku_annual: Optional[str] = None,
        webhook_success_base: Optional[str] = None,
        webhook_cancel_base: Optional[str] = None,
    ):
        self.api_key = api_key or os.environ.get("NEONPAY_API_KEY", "")
        self.sku_monthly = sku_monthly or os.environ.get("NEONPAY_PRICE_ID_MONTHLY", "mrkt-edge-monthly")
        self.sku_annual = sku_annual or os.environ.get("NEONPAY_PRICE_ID_ANNUAL", "mrkt-edge-annual")
        self.webhook_success_base = webhook_success_base or os.environ.get("NEONPAY_SUCCESS_URL_BASE", "http://localhost:5173")
        self.webhook_cancel_base = webhook_cancel_base or os.environ.get("NEONPAY_CANCEL_URL_BASE", "http://localhost:5173")

    def _headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }

    def create_subscription(
        self,
        plan: SubscriptionPlan,
        account_id: str,
        success_path: str = "/?subscription=success",
        cancel_path: str = "/?subscription=cancel",
    ) -> Dict[str, Any]:
        """
        Cria assinatura no NeonPay e retorna redirectUrl para o usuário concluir o pagamento.
        account_id: identificador do usuário (ex: email).
        """
        sku = self.sku_monthly if plan == SubscriptionPlan.MONTHLY else self.sku_annual
        frequency = "monthly" if plan == SubscriptionPlan.MONTHLY else "yearly"
        name = "MRKT Edge Mensal" if plan == SubscriptionPlan.MONTHLY else "MRKT Edge Anual"

        payload = {
            "sku": sku,
            "name": name,
            "price": 0,
            "currency": "USD",
            "frequency": frequency,
            "accountId": account_id,
            "successUrl": self.webhook_success_base.rstrip("/") + success_path,
            "cancelUrl": self.webhook_cancel_base.rstrip("/") + cancel_path,
            "locale": "en-US",
            "country": "US",
        }

        url = f"{NEONPAY_BASE.rstrip('/')}/subscription"
        try:
            r = requests.post(url, json=payload, headers=self._headers(), timeout=30)
            r.raise_for_status()
            data = r.json()
            sub = data.get("subscription") or {}
            redirect_url = data.get("redirectUrl") or ""
            return {
                "neonpay_subscription_id": sub.get("id"),
                "redirect_url": redirect_url,
                "status": (sub.get("status") or "inactive").lower(),
            }
        except requests.RequestException as e:
            logger.exception("NeonPay create_subscription failed: %s", e)
            raise

    def get_subscription(self, neonpay_subscription_id: str) -> Optional[Dict[str, Any]]:
        """Consulta assinatura no NeonPay."""
        if not neonpay_subscription_id:
            return None
        url = f"{NEONPAY_BASE.rstrip('/')}/subscriptions/{neonpay_subscription_id}"
        try:
            r = requests.get(url, headers=self._headers(), timeout=15)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            logger.warning("NeonPay get_subscription failed: %s", e)
            return None

    def cancel_subscription(self, neonpay_subscription_id: str) -> bool:
        """Solicita cancelamento no NeonPay (acesso até fim do período)."""
        if not neonpay_subscription_id:
            return False
        url = f"{NEONPAY_BASE.rstrip('/')}/subscriptions/{neonpay_subscription_id}/cancel"
        try:
            r = requests.post(url, headers=self._headers(), timeout=15)
            if r.status_code in (200, 204):
                return True
            logger.warning("NeonPay cancel_subscription status=%s body=%s", r.status_code, r.text[:200])
            return False
        except requests.RequestException as e:
            logger.exception("NeonPay cancel_subscription failed: %s", e)
            return False
