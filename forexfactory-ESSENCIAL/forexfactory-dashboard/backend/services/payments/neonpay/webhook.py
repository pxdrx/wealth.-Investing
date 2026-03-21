"""
Webhook NeonPay — validação de assinatura e processamento de eventos.
https://docs.neonpay.com/docs/webhooks-and-callbacks
"""
import os
import hmac
import hashlib
import json
import logging
from typing import Optional, Dict, Any, Callable

from .enums import SubscriptionStatus

logger = logging.getLogger(__name__)


def get_webhook_secret() -> str:
    return os.environ.get("NEONPAY_WEBHOOK_SECRET", "")


def verify_webhook_signature(body: bytes, signature: Optional[str]) -> bool:
    """
    Valida x-neon-digest (HMAC-SHA256 do body com o shared secret).
    Docs: digest passado em x-neon-digest; recriar HMAC do JSON com o secret.
    """
    secret = get_webhook_secret()
    if not secret or not signature:
        return False
    try:
        computed = hmac.new(
            secret.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(computed, signature)
    except Exception:
        return False


def handle_webhook_event(
    event_type: str,
    event_data: Dict[str, Any],
    on_subscription_activated: Optional[Callable[[Dict[str, Any]], None]] = None,
    on_subscription_canceled: Optional[Callable[[Dict[str, Any]], None]] = None,
    on_payment_failed: Optional[Callable[[Dict[str, Any]], None]] = None,
    on_invoice_paid: Optional[Callable[[Dict[str, Any]], None]] = None,
) -> None:
    """
    Processa evento do webhook e chama callbacks conforme o tipo.
    subscription.activated -> on_subscription_activated(data)
    subscription.canceled -> on_subscription_canceled(data)
    payment.failed -> on_payment_failed(data)
    invoice.paid -> on_invoice_paid(data) [renovação]
    """
    data = event_data.get("data") or event_data

    if event_type == "subscription.activated":
        sub = (data.get("subscription") or data) if isinstance(data, dict) else {}
        if on_subscription_activated and sub:
            on_subscription_activated(sub)

    elif event_type == "subscription.canceled":
        sub = (data.get("subscription") or data) if isinstance(data, dict) else {}
        if on_subscription_canceled and sub:
            on_subscription_canceled(sub)

    elif event_type == "payment.failed":
        if on_payment_failed and data:
            on_payment_failed(data)

    elif event_type == "invoice.paid":
        if on_invoice_paid and data:
            on_invoice_paid(data)

    else:
        logger.info("NeonPay webhook event ignored: type=%s", event_type)
