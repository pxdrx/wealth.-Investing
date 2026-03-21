"""
Enums para assinaturas NeonPay.
"""
from enum import Enum


class SubscriptionPlan(str, Enum):
    MONTHLY = "MONTHLY"
    ANNUAL = "ANNUAL"


class SubscriptionStatus(str, Enum):
    trial = "trial"
    active = "active"
    past_due = "past_due"
    canceled = "canceled"
    expired = "expired"
