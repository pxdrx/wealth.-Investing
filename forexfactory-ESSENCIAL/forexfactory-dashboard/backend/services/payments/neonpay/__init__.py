"""
Integração NeonPay — assinaturas mensais e anuais.
Backend como fonte da verdade; webhooks para sincronização.
"""
from .enums import SubscriptionPlan, SubscriptionStatus
from .client import NeonPayClient
from .webhook import verify_webhook_signature, handle_webhook_event

__all__ = [
    "SubscriptionPlan",
    "SubscriptionStatus",
    "NeonPayClient",
    "verify_webhook_signature",
    "handle_webhook_event",
]
