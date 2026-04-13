-- Fix subscription constraints to support mentor plan and manual billing

-- Add 'mentor' to plan check
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan = ANY (ARRAY['free', 'pro', 'ultra', 'elite', 'mentor']));

-- Allow NULL and 'manual' for billing_interval (admin-granted plans)
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_billing_interval_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_billing_interval_check
  CHECK (billing_interval IS NULL OR billing_interval = ANY (ARRAY['month', 'year', 'manual']));
